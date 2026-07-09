import * as ThreeBvhCsg from 'three-bvh-csg';
import * as ThreeMeshBvh from 'three-mesh-bvh';
import * as Meshoptimizer from 'meshoptimizer';

type CSGOperation = 'Union' | 'Subtract' | 'Intersect';
type CSGRole = 'Solid' | 'Room' | 'Cutter';

type CSGBoxDescriptor = {
  type: string;
  role: CSGRole;
  operation: CSGOperation;
  name: string;
  x: float;
  y: float;
  z: float;
  width: float;
  height: float;
  depth: float;
  wallThickness: float;
  facesInward: boolean;
  collisionLayer: float;
  collisionMask: float;
  collisionPriority: float;
  materialType: float;
};

type CSGBuildOptions = {
  operation?: string;
  calculateTangents?: boolean;
  autoSmooth?: boolean;
  smoothingAngle?: float;
  optimize?: boolean;
};

type GeometryArrays = {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
};

declare const THREE: any;

const globalObject = globalThis as any;
const gdjsNamespace = (globalObject.gdjs = globalObject.gdjs || {});
gdjsNamespace.scene3d = gdjsNamespace.scene3d || {};
gdjsNamespace.scene3d.csg = gdjsNamespace.scene3d.csg || {};

const csgNamespace = gdjsNamespace.scene3d.csg;

const normalizeOperation = (operation: string | undefined): CSGOperation => {
  if (operation === 'Subtract' || operation === 'Intersect') {
    return operation;
  }
  return 'Union';
};

const getCSGOperationConstant = (operation: CSGOperation) => {
  const csg = ThreeBvhCsg as any;
  if (operation === 'Subtract') {
    return csg.SUBTRACTION || csg.DIFFERENCE || 1;
  }
  if (operation === 'Intersect') {
    return csg.INTERSECTION || 2;
  }
  return csg.ADDITION || csg.UNION || 0;
};

const patchThreeMeshBvh = () => {
  if (!THREE || !THREE.BufferGeometry || !THREE.Mesh) {
    return;
  }

  const meshBvh = ThreeMeshBvh as any;
  if (meshBvh.computeBoundsTree) {
    THREE.BufferGeometry.prototype.computeBoundsTree =
      meshBvh.computeBoundsTree;
  }
  if (meshBvh.disposeBoundsTree) {
    THREE.BufferGeometry.prototype.disposeBoundsTree =
      meshBvh.disposeBoundsTree;
  }
  if (meshBvh.acceleratedRaycast) {
    THREE.Mesh.prototype.raycast = meshBvh.acceleratedRaycast;
  }
};

patchThreeMeshBvh();

const hashSeed = (seed: string): integer => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash >>> 0;
};

const createRandom = (seed: string): (() => float) => {
  let state = hashSeed(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 100000) / 100000;
  };
};

const setVariableNumber = (
  variable: gdjs.Variable,
  key: string,
  value: float
) => {
  variable.getChild(key).setNumber(value);
};

const setVariableString = (
  variable: gdjs.Variable,
  key: string,
  value: string
) => {
  variable.getChild(key).setString(value);
};

const setVariableBoolean = (
  variable: gdjs.Variable,
  key: string,
  value: boolean
) => {
  variable.getChild(key).setBoolean(value);
};

const writeBoxDescriptor = (
  variable: gdjs.Variable,
  index: integer,
  descriptor: CSGBoxDescriptor
) => {
  const boxVariable = variable.getChild(String(index));
  setVariableString(boxVariable, 'type', descriptor.type);
  setVariableString(boxVariable, 'role', descriptor.role);
  setVariableString(boxVariable, 'operation', descriptor.operation);
  setVariableString(boxVariable, 'name', descriptor.name);
  setVariableNumber(boxVariable, 'x', descriptor.x);
  setVariableNumber(boxVariable, 'y', descriptor.y);
  setVariableNumber(boxVariable, 'z', descriptor.z);
  setVariableNumber(boxVariable, 'width', descriptor.width);
  setVariableNumber(boxVariable, 'height', descriptor.height);
  setVariableNumber(boxVariable, 'depth', descriptor.depth);
  setVariableNumber(boxVariable, 'wallThickness', descriptor.wallThickness);
  setVariableBoolean(boxVariable, 'facesInward', descriptor.facesInward);
  setVariableNumber(boxVariable, 'collisionLayer', descriptor.collisionLayer);
  setVariableNumber(boxVariable, 'collisionMask', descriptor.collisionMask);
  setVariableNumber(
    boxVariable,
    'collisionPriority',
    descriptor.collisionPriority
  );
  setVariableNumber(boxVariable, 'materialType', descriptor.materialType);
};

const getObjectDescriptor = (
  object: gdjs.Cube3DRuntimeObject
): CSGBoxDescriptor => {
  const operation = object.getCSGOperation
    ? object.getCSGOperation()
    : 'Union';
  const roomMode = object.isRoomModeEnabled && object.isRoomModeEnabled();
  return {
    type: roomMode ? 'room' : 'box',
    role: operation === 'Subtract' ? 'Cutter' : roomMode ? 'Room' : 'Solid',
    operation,
    name: object.getName(),
    x: object.getX(),
    y: object.getY(),
    z: object.getZ(),
    width: Math.max(0.001, object.getWidth()),
    height: Math.max(0.001, object.getHeight()),
    depth: Math.max(0.001, object.getDepth()),
    wallThickness: object.getWallThickness ? object.getWallThickness() : 8,
    facesInward: object.areFacesInward ? object.areFacesInward() : false,
    collisionLayer: object.getCollisionLayer ? object.getCollisionLayer() : 0,
    collisionMask: object.getCollisionMask ? object.getCollisionMask() : 1,
    collisionPriority: object.getCollisionPriority
      ? object.getCollisionPriority()
      : 0,
    materialType: (object as any)._materialType || 0,
  };
};

const createBrushFromDescriptor = (descriptor: CSGBoxDescriptor) => {
  const Brush = (ThreeBvhCsg as any).Brush;
  const geometry = new THREE.BoxGeometry(
    descriptor.width,
    descriptor.height,
    descriptor.depth
  );
  geometry.translate(
    descriptor.x + descriptor.width / 2,
    descriptor.y + descriptor.height / 2,
    descriptor.z + descriptor.depth / 2
  );

  const brush = new Brush(geometry);
  brush.updateMatrixWorld();
  return brush;
};

const computeGeometryBoundsTree = (geometry: any) => {
  if (geometry && geometry.computeBoundsTree) {
    geometry.computeBoundsTree();
  }
};

const cleanupGeometry = (geometry: any, options: CSGBuildOptions) => {
  if (!geometry) {
    return geometry;
  }

  geometry.deleteAttribute('normal');
  geometry.computeVertexNormals();

  if (options.calculateTangents && geometry.computeTangents) {
    geometry.computeTangents();
  } else {
    geometry.deleteAttribute('tangent');
  }

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  computeGeometryBoundsTree(geometry);
  geometry.userData.gdjsCSGOptimized = !!options.optimize;
  geometry.userData.gdjsAutoSmooth = options.autoSmooth !== false;
  geometry.userData.gdjsSmoothingAngle = Math.max(
    0,
    Math.min(180, options.smoothingAngle === undefined ? 45 : options.smoothingAngle)
  );
  return geometry;
};

const extractGeometryArrays = (geometry: any): GeometryArrays => {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  const index = geometry.getIndex();
  return {
    positions: Array.from(position ? position.array : []),
    normals: Array.from(normal ? normal.array : []),
    uvs: Array.from(uv ? uv.array : []),
    indices: Array.from(index ? index.array : []),
  };
};

const writeGeometryArrays = (
  variable: gdjs.Variable,
  geometry: any,
  descriptors: CSGBoxDescriptor[]
) => {
  const arrays = extractGeometryArrays(geometry);
  setVariableNumber(variable, 'vertexCount', arrays.positions.length / 3);
  setVariableNumber(variable, 'triangleCount', arrays.indices.length / 3);
  setVariableNumber(variable, 'sourceCount', descriptors.length);

  const geometryVariable = variable.getChild('geometry');
  geometryVariable.getChild('positions').fromJSObject(arrays.positions);
  geometryVariable.getChild('normals').fromJSObject(arrays.normals);
  geometryVariable.getChild('uvs').fromJSObject(arrays.uvs);
  geometryVariable.getChild('indices').fromJSObject(arrays.indices);

  const sourcesVariable = variable.getChild('sources');
  for (let index = 0; index < descriptors.length; index++) {
    writeBoxDescriptor(sourcesVariable, index, descriptors[index]);
  }
};

const writeCollisionShape = (
  variable: gdjs.Variable,
  geometry: any,
  descriptors: CSGBoxDescriptor[]
) => {
  writeGeometryArrays(variable, geometry, descriptors);
  setVariableString(variable, 'kind', 'collisionShape');
  setVariableNumber(
    variable,
    'collisionLayer',
    descriptors.reduce((layer, descriptor) => layer | descriptor.collisionLayer, 0)
  );
  setVariableNumber(
    variable,
    'collisionMask',
    descriptors.reduce((mask, descriptor) => mask | descriptor.collisionMask, 0)
  );
  setVariableNumber(
    variable,
    'collisionPriority',
    descriptors.reduce(
      (priority, descriptor) =>
        Math.max(priority, descriptor.collisionPriority),
      0
    )
  );
};

const optimizeGeometryWithMeshoptimizer = async (geometry: any) => {
  const meshopt = Meshoptimizer as any;
  const encoder = meshopt.MeshoptEncoder;
  if (!encoder || !geometry || !geometry.getIndex()) {
    return geometry;
  }

  if (encoder.ready) {
    await encoder.ready;
  }

  const index = geometry.getIndex();
  const position = geometry.getAttribute('position');
  if (!index || !position) {
    return geometry;
  }

  const indices = Array.from(index.array) as number[];
  const optimizedIndices = encoder.optimizeVertexCache(
    indices,
    position.count
  );
  geometry.setIndex(optimizedIndices);
  index.needsUpdate = true;
  geometry.userData.gdjsMeshoptimizer = true;
  return geometry;
};

class CSGCombiner3D {
  static buildGeometry(
    objects: gdjs.Cube3DRuntimeObject[],
    options: CSGBuildOptions = {}
  ) {
    const descriptors = objects.map(getObjectDescriptor);
    return this.buildGeometryFromDescriptors(descriptors, options);
  }

  static buildGeometryFromDescriptors(
    descriptors: CSGBoxDescriptor[],
    options: CSGBuildOptions = {}
  ) {
    if (!descriptors.length) {
      return new THREE.BufferGeometry();
    }

    const Evaluator = (ThreeBvhCsg as any).Evaluator;
    const evaluator = new Evaluator();
    evaluator.useGroups = true;
    evaluator.consolidateGroups = true;

    let result = createBrushFromDescriptor(descriptors[0]);
    for (let index = 1; index < descriptors.length; index++) {
      const descriptor = descriptors[index];
      const brush = createBrushFromDescriptor(descriptor);
      const operation = normalizeOperation(
        options.operation || descriptor.operation
      );
      result = evaluator.evaluate(
        result,
        brush,
        getCSGOperationConstant(operation)
      );
      computeGeometryBoundsTree(result.geometry);
    }

    return cleanupGeometry(result.geometry, options);
  }

  static async buildOptimizedGeometry(
    objects: gdjs.Cube3DRuntimeObject[],
    options: CSGBuildOptions = {}
  ) {
    const geometry = this.buildGeometry(objects, options);
    if (options.optimize !== false) {
      await optimizeGeometryWithMeshoptimizer(geometry);
    }
    return cleanupGeometry(geometry, options);
  }

  static describe(objects: gdjs.Cube3DRuntimeObject[]) {
    return objects.map(getObjectDescriptor);
  }
}

const generateConnectedRooms = (
  seed: string,
  roomCount: float,
  minimumRoomSize: float,
  maximumRoomSize: float,
  corridorWidth: float,
  resultVariable: gdjs.Variable
) => {
  resultVariable.clearChildren();
  const random = createRandom(seed || 'CarrotsEngine');
  const count = Math.max(1, Math.floor(roomCount || 1));
  const minSize = Math.max(16, minimumRoomSize || 96);
  const maxSize = Math.max(minSize, maximumRoomSize || minSize * 2);
  const corridorSize = Math.max(8, corridorWidth || 32);
  const roomsVariable = resultVariable.getChild('rooms');
  const corridorsVariable = resultVariable.getChild('corridors');

  let cursorX = 0;
  let cursorZ = 0;
  let previousCenterX = 0;
  let previousCenterZ = 0;

  for (let index = 0; index < count; index++) {
    const width = minSize + Math.floor(random() * (maxSize - minSize));
    const depth = minSize + Math.floor(random() * (maxSize - minSize));
    const height = maxSize;
    const x = cursorX;
    const z = cursorZ;
    const room: CSGBoxDescriptor = {
      type: 'room',
      role: 'Room',
      operation: 'Union',
      name: `Room ${index + 1}`,
      x,
      y: 0,
      z,
      width,
      height,
      depth,
      wallThickness: Math.max(8, corridorSize / 4),
      facesInward: true,
      collisionLayer: 0,
      collisionMask: 1,
      collisionPriority: 0,
      materialType: 0,
    };
    writeBoxDescriptor(roomsVariable, index, room);

    const centerX = x + width / 2;
    const centerZ = z + depth / 2;
    if (index > 0) {
      const corridorX = Math.min(previousCenterX, centerX);
      const corridorZ = Math.min(previousCenterZ, centerZ);
      writeBoxDescriptor(corridorsVariable, index - 1, {
        ...room,
        type: 'corridor',
        role: 'Solid',
        name: `Corridor ${index}A`,
        x: corridorX,
        z: corridorZ - corridorSize / 2,
        width: Math.abs(centerX - previousCenterX) || corridorSize,
        depth: corridorSize,
      });
      writeBoxDescriptor(corridorsVariable, count + index - 1, {
        ...room,
        type: 'corridor',
        role: 'Solid',
        name: `Corridor ${index}B`,
        x: centerX - corridorSize / 2,
        z: corridorZ,
        width: corridorSize,
        depth: Math.abs(centerZ - previousCenterZ) || corridorSize,
      });
    }

    previousCenterX = centerX;
    previousCenterZ = centerZ;
    cursorX += width + corridorSize + Math.floor(random() * maxSize);
    cursorZ +=
      (random() > 0.5 ? 1 : -1) *
      (depth + corridorSize + Math.floor(random() * maxSize));
  }

  setVariableString(resultVariable, 'seed', seed || 'CarrotsEngine');
  setVariableNumber(resultVariable, 'roomCount', count);
  setVariableNumber(resultVariable, 'corridorWidth', corridorSize);
};

const combineBoxes = (
  objects: gdjs.Cube3DRuntimeObject[],
  operation: string,
  resultVariable: gdjs.Variable
) => {
  resultVariable.clearChildren();
  const descriptors = CSGCombiner3D.describe(objects);
  const geometry = CSGCombiner3D.buildGeometry(objects, {
    operation,
    optimize: true,
    calculateTangents: true,
  });
  setVariableString(resultVariable, 'operation', normalizeOperation(operation));
  setVariableString(resultVariable, 'kind', 'staticMesh');
  writeGeometryArrays(resultVariable, geometry, descriptors);
};

const bakeStaticMesh = (
  objects: gdjs.Cube3DRuntimeObject[],
  operation: string,
  resultVariable: gdjs.Variable
) => {
  combineBoxes(objects, operation, resultVariable);
};

const bakeCollisionShape = (
  objects: gdjs.Cube3DRuntimeObject[],
  operation: string,
  resultVariable: gdjs.Variable
) => {
  resultVariable.clearChildren();
  const descriptors = CSGCombiner3D.describe(objects);
  const geometry = CSGCombiner3D.buildGeometry(objects, {
    operation,
    optimize: true,
  });
  writeCollisionShape(resultVariable, geometry, descriptors);
};

const flipFaces = (object: gdjs.RuntimeObject) => {
  const csgObject = object as gdjs.Cube3DRuntimeObject;
  if (csgObject.flipFaces) {
    csgObject.flipFaces();
  }
};

csgNamespace.CSGCombiner3D = CSGCombiner3D;
csgNamespace.generateConnectedRooms = generateConnectedRooms;
csgNamespace.combineBoxes = combineBoxes;
csgNamespace.bakeStaticMesh = bakeStaticMesh;
csgNamespace.bakeCollisionShape = bakeCollisionShape;
csgNamespace.flipFaces = flipFaces;
csgNamespace.patchThreeMeshBvh = patchThreeMeshBvh;
csgNamespace.optimizeGeometryWithMeshoptimizer = optimizeGeometryWithMeshoptimizer;
