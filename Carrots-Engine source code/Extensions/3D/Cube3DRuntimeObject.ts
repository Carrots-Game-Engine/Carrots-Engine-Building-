namespace gdjs {
  type Cube3DMaterialTypeString =
    | 'Basic'
    | 'StandardWithoutMetalness'
    | 'Matte'
    | 'Standard'
    | 'Glossy'
    | 'Metallic';

  /**
   * Base parameters for {@link gdjs.Cube3DRuntimeObject}
   * @category Objects > 3D Box
   */
  export interface Cube3DObjectData extends Object3DData {
    /** The base parameters of the Cube3D object */
    content: Object3DDataContent & {
      enableTextureTransparency: boolean | undefined;
      facesOrientation: 'Y' | 'Z' | undefined;
      frontFaceResourceName: string;
      backFaceResourceName: string;
      backFaceUpThroughWhichAxisRotation: 'X' | 'Y' | undefined;
      leftFaceResourceName: string;
      rightFaceResourceName: string;
      topFaceResourceName: string;
      bottomFaceResourceName: string;
      frontFaceResourceRepeat: boolean | undefined;
      backFaceResourceRepeat: boolean | undefined;
      leftFaceResourceRepeat: boolean | undefined;
      rightFaceResourceRepeat: boolean | undefined;
      topFaceResourceRepeat: boolean | undefined;
      bottomFaceResourceRepeat: boolean | undefined;
      frontFaceVisible: boolean;
      backFaceVisible: boolean;
      leftFaceVisible: boolean;
      rightFaceVisible: boolean;
      topFaceVisible: boolean;
      bottomFaceVisible: boolean;
      tint: string | undefined;
      isCastingShadow: boolean;
      isReceivingShadow: boolean;
      materialType?: Cube3DMaterialTypeString;
      csgRole?: 'Solid' | 'Room' | 'Cutter';
      csgMode?: 'Box' | 'Combined';
      csgOperation?: 'Union' | 'Subtract' | 'Intersect';
      roomMode?: boolean;
      facesInward?: boolean;
      wallThickness?: number;
      generateCollision?: boolean;
      collisionLayer?: number;
      collisionMask?: number;
      collisionPriority?: number;
      calculateTangents?: boolean;
      autoSmooth?: boolean;
      smoothingAngle?: number;
    };
  }
  type FaceName = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';
  const faceNameToBitmaskIndex = {
    front: 0,
    back: 1,
    left: 2,
    right: 3,
    top: 4,
    bottom: 5,
  };

  type Cube3DObjectNetworkSyncDataType = {
    fo: 'Y' | 'Z';
    bfu: 'X' | 'Y';
    vfb: integer;
    trfb: integer;
    frn: [string, string, string, string, string, string];
    mt: number;
    tint: string;
    cm: 'Box' | 'Combined';
    cr: 'Solid' | 'Room' | 'Cutter';
    co: 'Union' | 'Subtract' | 'Intersect';
    rm: boolean;
    fi: boolean;
    wt: float;
    gc: boolean;
    cl: number;
    ck: number;
    cp: number;
    ct: boolean;
    as: boolean;
    sa: number;
  };

  type Cube3DObjectNetworkSyncData = Object3DNetworkSyncData &
    Cube3DObjectNetworkSyncDataType;

  /**
   * Shows a 3D box object.
   * @category Objects > 3D Box
   */
  export class Cube3DRuntimeObject extends gdjs.RuntimeObject3D {
    private _renderer: Cube3DRuntimeObjectRenderer;
    private _facesOrientation: 'Y' | 'Z';
    private _backFaceUpThroughWhichAxisRotation: 'X' | 'Y';
    private _shouldUseTransparentTexture: boolean;
    // `_rotationZ` is `angle` from `gdjs.RuntimeObject`.
    private _visibleFacesBitmask: integer;
    private _textureRepeatFacesBitmask: integer;
    private _faceResourceNames: [
      string,
      string,
      string,
      string,
      string,
      string,
    ];
    _materialType: gdjs.Cube3DRuntimeObject.MaterialType =
      gdjs.Cube3DRuntimeObject.MaterialType.Standard;
    _tint: string;
    _isCastingShadow: boolean = true;
    _isReceivingShadow: boolean = true;
    private _csgMode: 'Box' | 'Combined';
    private _csgRole: 'Solid' | 'Room' | 'Cutter';
    private _csgOperation: 'Union' | 'Subtract' | 'Intersect';
    private _roomMode: boolean;
    private _facesInward: boolean;
    private _wallThickness: number;
    private _generateCollision: boolean;
    private _collisionLayer: number;
    private _collisionMask: number;
    private _collisionPriority: number;
    private _calculateTangents: boolean;
    private _autoSmooth: boolean;
    private _smoothingAngle: number;

    constructor(
      instanceContainer: gdjs.RuntimeInstanceContainer,
      objectData: Cube3DObjectData,
      instanceData?: InstanceData
    ) {
      super(instanceContainer, objectData, instanceData);
      this._shouldUseTransparentTexture =
        objectData.content.enableTextureTransparency || false;
      this._facesOrientation = objectData.content.facesOrientation || 'Y';
      this._visibleFacesBitmask = 0;
      if (objectData.content.frontFaceVisible)
        this._visibleFacesBitmask |= 1 << faceNameToBitmaskIndex['front'];
      if (objectData.content.backFaceVisible)
        this._visibleFacesBitmask |= 1 << faceNameToBitmaskIndex['back'];
      if (objectData.content.leftFaceVisible)
        this._visibleFacesBitmask |= 1 << faceNameToBitmaskIndex['left'];
      if (objectData.content.rightFaceVisible)
        this._visibleFacesBitmask |= 1 << faceNameToBitmaskIndex['right'];
      if (objectData.content.topFaceVisible)
        this._visibleFacesBitmask |= 1 << faceNameToBitmaskIndex['top'];
      if (objectData.content.bottomFaceVisible)
        this._visibleFacesBitmask |= 1 << faceNameToBitmaskIndex['bottom'];
      this._textureRepeatFacesBitmask = 0;
      if (objectData.content.frontFaceResourceRepeat)
        this._textureRepeatFacesBitmask |= 1 << faceNameToBitmaskIndex['front'];
      if (objectData.content.backFaceResourceRepeat)
        this._textureRepeatFacesBitmask |= 1 << faceNameToBitmaskIndex['back'];
      if (objectData.content.leftFaceResourceRepeat)
        this._textureRepeatFacesBitmask |= 1 << faceNameToBitmaskIndex['left'];
      if (objectData.content.rightFaceResourceRepeat)
        this._textureRepeatFacesBitmask |= 1 << faceNameToBitmaskIndex['right'];
      if (objectData.content.topFaceResourceRepeat)
        this._textureRepeatFacesBitmask |= 1 << faceNameToBitmaskIndex['top'];
      if (objectData.content.bottomFaceResourceRepeat)
        this._textureRepeatFacesBitmask |=
          1 << faceNameToBitmaskIndex['bottom'];
      this._backFaceUpThroughWhichAxisRotation =
        objectData.content.backFaceUpThroughWhichAxisRotation || 'X';
      this._faceResourceNames = [
        objectData.content.frontFaceResourceName,
        objectData.content.backFaceResourceName,
        objectData.content.leftFaceResourceName,
        objectData.content.rightFaceResourceName,
        objectData.content.topFaceResourceName,
        objectData.content.bottomFaceResourceName,
      ];

      this._tint = objectData.content.tint || '255;255;255';
      this._isCastingShadow =
        objectData.content.isCastingShadow !== undefined
          ? !!objectData.content.isCastingShadow
          : true;
      this._isReceivingShadow =
        objectData.content.isReceivingShadow !== undefined
          ? !!objectData.content.isReceivingShadow
          : true;
      this._csgMode = objectData.content.csgMode || 'Box';
      this._csgRole =
        objectData.content.csgRole ||
        (objectData.content.roomMode
          ? 'Room'
          : objectData.content.csgOperation === 'Subtract'
            ? 'Cutter'
            : 'Solid');
      this._csgOperation = objectData.content.csgOperation || 'Union';
      this._roomMode = !!objectData.content.roomMode;
      this._facesInward = !!objectData.content.facesInward || this._roomMode;
      this._wallThickness = objectData.content.wallThickness || 8;
      this._generateCollision =
        objectData.content.generateCollision !== undefined
          ? !!objectData.content.generateCollision
          : false;
      this._collisionLayer = Math.max(0, objectData.content.collisionLayer || 0);
      this._collisionMask =
        objectData.content.collisionMask !== undefined
          ? Math.max(0, objectData.content.collisionMask)
          : 1;
      this._collisionPriority = objectData.content.collisionPriority || 0;
      this._calculateTangents = !!objectData.content.calculateTangents;
      this._autoSmooth = objectData.content.autoSmooth !== false;
      this._smoothingAngle =
        objectData.content.smoothingAngle !== undefined
          ? Math.max(0, Math.min(180, objectData.content.smoothingAngle))
          : 30;

      this._materialType = this._convertMaterialType(
        objectData.content.materialType
      );

      this._renderer = new gdjs.Cube3DRuntimeObjectRenderer(
        this,
        instanceContainer
      );

      // *ALWAYS* call `this.onCreated()` at the very end of your object constructor.
      this.onCreated();
    }

    /**
     * Sets the visibility of a face of the 3D box.
     *
     * @param faceName - The name of the face to set visibility for.
     * @param enable - The visibility value to set.
     */
    setFaceVisibility(faceName: FaceName, enable: boolean) {
      const faceIndex = faceNameToBitmaskIndex[faceName];
      if (faceIndex === undefined) {
        return;
      }
      if (enable === this.isFaceAtIndexVisible(faceIndex)) {
        return;
      }

      if (enable) {
        this._visibleFacesBitmask |= 1 << faceIndex;
      } else {
        this._visibleFacesBitmask &= ~(1 << faceIndex);
      }
      this._renderer.updateFace(faceIndex);
    }

    /**
     * Sets the texture repeat of a face of the 3D box.
     *
     * @param faceName - The name of the face to set visibility for.
     * @param enable - The visibility value to set.
     */
    setRepeatTextureOnFace(faceName: FaceName, enable: boolean) {
      const faceIndex = faceNameToBitmaskIndex[faceName];
      if (faceIndex === undefined) {
        return;
      }
      if (enable === this.shouldRepeatTextureOnFaceAtIndex(faceIndex)) {
        return;
      }

      if (enable) {
        this._textureRepeatFacesBitmask |= 1 << faceIndex;
      } else {
        this._textureRepeatFacesBitmask &= ~(1 << faceIndex);
      }
      this._renderer.updateFace(faceIndex);
    }

    isFaceVisible(faceName: FaceName): boolean {
      const faceIndex = faceNameToBitmaskIndex[faceName];
      if (faceIndex === undefined) {
        return false;
      }

      return this.isFaceAtIndexVisible(faceIndex);
    }

    /** @internal */
    isFaceAtIndexVisible(faceIndex): boolean {
      return (this._visibleFacesBitmask & (1 << faceIndex)) !== 0;
    }

    /** @internal */
    shouldRepeatTextureOnFaceAtIndex(faceIndex): boolean {
      return (this._textureRepeatFacesBitmask & (1 << faceIndex)) !== 0;
    }

    setFaceResourceName(faceName: FaceName, resourceName: string): void {
      const faceIndex = faceNameToBitmaskIndex[faceName];
      if (faceIndex === undefined) {
        return;
      }
      if (this._faceResourceNames[faceIndex] === resourceName) {
        return;
      }
      this._faceResourceNames[faceIndex] = resourceName;
      this._renderer.updateFace(faceIndex);
    }

    setColor(tint: string): void {
      if (this._tint === tint) {
        return;
      }
      this._tint = tint;
      this._renderer.updateTint();
    }

    getColor(): string {
      return this._tint;
    }

    /** @internal */
    getFaceAtIndexResourceName(faceIndex: integer): string {
      return this._faceResourceNames[faceIndex];
    }

    getRenderer(): gdjs.RuntimeObject3DRenderer {
      return this._renderer;
    }

    getBackFaceUpThroughWhichAxisRotation(): 'X' | 'Y' {
      return this._backFaceUpThroughWhichAxisRotation;
    }

    setBackFaceUpThroughWhichAxisRotation(axis: 'X' | 'Y'): void {
      this._backFaceUpThroughWhichAxisRotation = axis;
      this._renderer.updateFace(faceNameToBitmaskIndex['back']);
    }

    getFacesOrientation(): 'Y' | 'Z' {
      return this._facesOrientation;
    }

    setFacesOrientation(orientation: 'Y' | 'Z'): void {
      this._facesOrientation = orientation;
      this._renderer.updateFace(faceNameToBitmaskIndex['left']);
      this._renderer.updateFace(faceNameToBitmaskIndex['right']);
      this._renderer.updateFace(faceNameToBitmaskIndex['top']);
      // Bottom texture should not change based on that setting.
    }

    updateFromObjectData(
      oldObjectData: Cube3DObjectData,
      newObjectData: Cube3DObjectData
    ): boolean {
      super.updateFromObjectData(oldObjectData, newObjectData);
      if (
        oldObjectData.content.frontFaceVisible !==
        newObjectData.content.frontFaceVisible
      ) {
        this.setFaceVisibility('front', newObjectData.content.frontFaceVisible);
      }
      if (
        oldObjectData.content.backFaceVisible !==
        newObjectData.content.backFaceVisible
      ) {
        this.setFaceVisibility('back', newObjectData.content.backFaceVisible);
      }
      if (
        oldObjectData.content.leftFaceVisible !==
        newObjectData.content.leftFaceVisible
      ) {
        this.setFaceVisibility('left', newObjectData.content.leftFaceVisible);
      }
      if (
        oldObjectData.content.rightFaceVisible !==
        newObjectData.content.rightFaceVisible
      ) {
        this.setFaceVisibility('right', newObjectData.content.rightFaceVisible);
      }
      if (
        oldObjectData.content.topFaceVisible !==
        newObjectData.content.topFaceVisible
      ) {
        this.setFaceVisibility('top', newObjectData.content.topFaceVisible);
      }
      if (
        oldObjectData.content.bottomFaceVisible !==
        newObjectData.content.bottomFaceVisible
      ) {
        this.setFaceVisibility(
          'bottom',
          newObjectData.content.bottomFaceVisible
        );
      }
      if (
        oldObjectData.content.frontFaceResourceName !==
        newObjectData.content.frontFaceResourceName
      ) {
        this.setFaceResourceName(
          'front',
          newObjectData.content.frontFaceResourceName
        );
      }
      if (oldObjectData.content.tint !== newObjectData.content.tint) {
        this.setColor(newObjectData.content.tint || '255;255;255');
      }

      if (
        oldObjectData.content.backFaceResourceName !==
        newObjectData.content.backFaceResourceName
      ) {
        this.setFaceResourceName(
          'back',
          newObjectData.content.backFaceResourceName
        );
      }
      if (
        oldObjectData.content.leftFaceResourceName !==
        newObjectData.content.leftFaceResourceName
      ) {
        this.setFaceResourceName(
          'left',
          newObjectData.content.leftFaceResourceName
        );
      }
      if (
        oldObjectData.content.rightFaceResourceName !==
        newObjectData.content.rightFaceResourceName
      ) {
        this.setFaceResourceName(
          'right',
          newObjectData.content.rightFaceResourceName
        );
      }
      if (
        oldObjectData.content.topFaceResourceName !==
        newObjectData.content.topFaceResourceName
      ) {
        this.setFaceResourceName(
          'top',
          newObjectData.content.topFaceResourceName
        );
      }
      if (
        oldObjectData.content.bottomFaceResourceName !==
        newObjectData.content.bottomFaceResourceName
      ) {
        this.setFaceResourceName(
          'bottom',
          newObjectData.content.bottomFaceResourceName
        );
      }
      if (
        oldObjectData.content.frontFaceResourceRepeat !==
        newObjectData.content.frontFaceResourceRepeat
      ) {
        this.setRepeatTextureOnFace(
          'front',
          newObjectData.content.frontFaceResourceRepeat || false
        );
      }
      if (
        oldObjectData.content.backFaceResourceRepeat !==
        newObjectData.content.backFaceResourceRepeat
      ) {
        this.setRepeatTextureOnFace(
          'back',
          newObjectData.content.backFaceResourceRepeat || false
        );
      }
      if (
        oldObjectData.content.leftFaceResourceRepeat !==
        newObjectData.content.leftFaceResourceRepeat
      ) {
        this.setRepeatTextureOnFace(
          'left',
          newObjectData.content.leftFaceResourceRepeat || false
        );
      }
      if (
        oldObjectData.content.rightFaceResourceRepeat !==
        newObjectData.content.rightFaceResourceRepeat
      ) {
        this.setRepeatTextureOnFace(
          'right',
          newObjectData.content.rightFaceResourceRepeat || false
        );
      }
      if (
        oldObjectData.content.topFaceResourceRepeat !==
        newObjectData.content.topFaceResourceRepeat
      ) {
        this.setRepeatTextureOnFace(
          'top',
          newObjectData.content.topFaceResourceRepeat || false
        );
      }
      if (
        oldObjectData.content.bottomFaceResourceRepeat !==
        newObjectData.content.bottomFaceResourceRepeat
      ) {
        this.setRepeatTextureOnFace(
          'bottom',
          newObjectData.content.bottomFaceResourceRepeat || false
        );
      }
      if (
        oldObjectData.content.backFaceUpThroughWhichAxisRotation !==
        newObjectData.content.backFaceUpThroughWhichAxisRotation
      ) {
        this.setBackFaceUpThroughWhichAxisRotation(
          newObjectData.content.backFaceUpThroughWhichAxisRotation || 'X'
        );
      }
      if (
        oldObjectData.content.facesOrientation !==
        newObjectData.content.facesOrientation
      ) {
        this.setFacesOrientation(newObjectData.content.facesOrientation || 'Y');
      }
      if (
        oldObjectData.content.materialType !==
        newObjectData.content.materialType
      ) {
        this.setMaterialType(newObjectData.content.materialType || 'Standard');
      }
      if (
        oldObjectData.content.isCastingShadow !==
        newObjectData.content.isCastingShadow
      ) {
        this.updateShadowCasting(newObjectData.content.isCastingShadow);
      }
      if (
        oldObjectData.content.isReceivingShadow !==
        newObjectData.content.isReceivingShadow
      ) {
        this.updateShadowReceiving(newObjectData.content.isReceivingShadow);
      }
      if (oldObjectData.content.csgMode !== newObjectData.content.csgMode) {
        this.setCSGMode(newObjectData.content.csgMode || 'Box');
      }
      if (oldObjectData.content.csgRole !== newObjectData.content.csgRole) {
        this.setCSGRole(newObjectData.content.csgRole || 'Solid');
      }
      if (
        oldObjectData.content.csgOperation !==
        newObjectData.content.csgOperation
      ) {
        this.setCSGOperation(newObjectData.content.csgOperation || 'Union');
      }
      if (oldObjectData.content.roomMode !== newObjectData.content.roomMode) {
        this.setRoomMode(!!newObjectData.content.roomMode);
      }
      if (
        oldObjectData.content.facesInward !== newObjectData.content.facesInward
      ) {
        this.setFacesInward(!!newObjectData.content.facesInward);
      }
      if (
        oldObjectData.content.wallThickness !==
        newObjectData.content.wallThickness
      ) {
        this.setWallThickness(newObjectData.content.wallThickness || 8);
      }
      if (
        oldObjectData.content.generateCollision !==
        newObjectData.content.generateCollision
      ) {
        this.setCollisionGenerationEnabled(
          !!newObjectData.content.generateCollision
        );
      }
      if (
        oldObjectData.content.collisionLayer !==
        newObjectData.content.collisionLayer
      ) {
        this.setCollisionLayer(newObjectData.content.collisionLayer || 0);
      }
      if (
        oldObjectData.content.collisionMask !==
        newObjectData.content.collisionMask
      ) {
        this.setCollisionMask(
          newObjectData.content.collisionMask !== undefined
            ? newObjectData.content.collisionMask
            : 1
        );
      }
      if (
        oldObjectData.content.collisionPriority !==
        newObjectData.content.collisionPriority
      ) {
        this.setCollisionPriority(newObjectData.content.collisionPriority || 0);
      }
      if (
        oldObjectData.content.calculateTangents !==
        newObjectData.content.calculateTangents
      ) {
        this.setCalculateTangentsEnabled(!!newObjectData.content.calculateTangents);
      }
      if (oldObjectData.content.autoSmooth !== newObjectData.content.autoSmooth) {
        this.setAutoSmoothEnabled(newObjectData.content.autoSmooth !== false);
      }
      if (
        oldObjectData.content.smoothingAngle !==
        newObjectData.content.smoothingAngle
      ) {
        this.setSmoothingAngle(newObjectData.content.smoothingAngle || 30);
      }

      return true;
    }

    getNetworkSyncData(
      syncOptions: GetNetworkSyncDataOptions
    ): Cube3DObjectNetworkSyncData {
      return {
        ...super.getNetworkSyncData(syncOptions),
        mt: this._materialType,
        fo: this._facesOrientation,
        bfu: this._backFaceUpThroughWhichAxisRotation,
        vfb: this._visibleFacesBitmask,
        trfb: this._textureRepeatFacesBitmask,
        frn: this._faceResourceNames,
        tint: this._tint,
        cm: this._csgMode,
        cr: this._csgRole,
        co: this._csgOperation,
        rm: this._roomMode,
        fi: this._facesInward,
        wt: this._wallThickness,
        gc: this._generateCollision,
        cl: this._collisionLayer,
        ck: this._collisionMask,
        cp: this._collisionPriority,
        ct: this._calculateTangents,
        as: this._autoSmooth,
        sa: this._smoothingAngle,
      };
    }

    updateFromNetworkSyncData(
      networkSyncData: Cube3DObjectNetworkSyncData,
      options: UpdateFromNetworkSyncDataOptions
    ): void {
      super.updateFromNetworkSyncData(networkSyncData, options);

      if (networkSyncData.mt !== undefined) {
        this._materialType = networkSyncData.mt;
      }
      if (networkSyncData.fo !== undefined) {
        if (this._facesOrientation !== networkSyncData.fo) {
          this.setFacesOrientation(networkSyncData.fo);
        }
      }
      if (networkSyncData.bfu !== undefined) {
        if (this._backFaceUpThroughWhichAxisRotation !== networkSyncData.bfu) {
          this.setBackFaceUpThroughWhichAxisRotation(networkSyncData.bfu);
        }
      }
      if (networkSyncData.vfb !== undefined) {
        // If it is different, update all the faces.
        if (this._visibleFacesBitmask !== networkSyncData.vfb) {
          this._visibleFacesBitmask = networkSyncData.vfb;
          for (let i = 0; i < this._faceResourceNames.length; i++) {
            this._renderer.updateFace(i);
          }
        }
      }
      if (networkSyncData.trfb !== undefined) {
        // If it is different, update all the faces.
        if (this._textureRepeatFacesBitmask !== networkSyncData.trfb) {
          this._textureRepeatFacesBitmask = networkSyncData.trfb;
          for (let i = 0; i < this._faceResourceNames.length; i++) {
            this._renderer.updateFace(i);
          }
        }
      }
      if (networkSyncData.frn !== undefined) {
        // If one element is different, update all the faces.
        if (
          !this._faceResourceNames.every(
            (value, index) => value === networkSyncData.frn[index]
          )
        ) {
          this._faceResourceNames = networkSyncData.frn;
          // Update all faces. (Could optimize to only update the changed ones)
          for (let i = 0; i < this._faceResourceNames.length; i++) {
            this._renderer.updateFace(i);
          }
        }
      }
      if (networkSyncData.tint !== undefined) {
        if (this._tint !== networkSyncData.tint) {
          this._tint = networkSyncData.tint;
          this._renderer.updateTint();
        }
      }
      if (networkSyncData.cm !== undefined) {
        this.setCSGMode(networkSyncData.cm);
      }
      if (networkSyncData.cr !== undefined) {
        this.setCSGRole(networkSyncData.cr);
      }
      if (networkSyncData.co !== undefined) {
        this.setCSGOperation(networkSyncData.co);
      }
      if (networkSyncData.rm !== undefined) {
        this.setRoomMode(networkSyncData.rm);
      }
      if (networkSyncData.fi !== undefined) {
        this.setFacesInward(networkSyncData.fi);
      }
      if (networkSyncData.wt !== undefined) {
        this.setWallThickness(networkSyncData.wt);
      }
      if (networkSyncData.gc !== undefined) {
        this.setCollisionGenerationEnabled(networkSyncData.gc);
      }
      if (networkSyncData.cl !== undefined) {
        this.setCollisionLayer(networkSyncData.cl);
      }
      if (networkSyncData.ck !== undefined) {
        this.setCollisionMask(networkSyncData.ck);
      }
      if (networkSyncData.cp !== undefined) {
        this.setCollisionPriority(networkSyncData.cp);
      }
      if (networkSyncData.ct !== undefined) {
        this.setCalculateTangentsEnabled(networkSyncData.ct);
      }
      if (networkSyncData.as !== undefined) {
        this.setAutoSmoothEnabled(networkSyncData.as);
      }
      if (networkSyncData.sa !== undefined) {
        this.setSmoothingAngle(networkSyncData.sa);
      }
    }

    /**
     * Return true if the texture transparency should be enabled.
     */
    shouldUseTransparentTexture(): boolean {
      return this._shouldUseTransparentTexture;
    }

    _convertMaterialType(
      materialTypeString: string | undefined
    ): gdjs.Cube3DRuntimeObject.MaterialType {
      switch (materialTypeString) {
        case 'Basic':
          return gdjs.Cube3DRuntimeObject.MaterialType.Basic;
        case 'StandardWithoutMetalness':
          return gdjs.Cube3DRuntimeObject.MaterialType.StandardWithoutMetalness;
        case 'Matte':
          return gdjs.Cube3DRuntimeObject.MaterialType.Matte;
        case 'Glossy':
          return gdjs.Cube3DRuntimeObject.MaterialType.Glossy;
        case 'Metallic':
          return gdjs.Cube3DRuntimeObject.MaterialType.Metallic;
        case 'Standard':
        default:
          return gdjs.Cube3DRuntimeObject.MaterialType.Standard;
      }
    }

    setMaterialType(materialTypeString: string) {
      const newMaterialType = this._convertMaterialType(materialTypeString);
      if (this._materialType === newMaterialType) {
        return;
      }

      this._materialType = newMaterialType;
      this._renderer._updateMaterials();
    }
    updateShadowCasting(value: boolean | undefined) {
      const normalizedValue = value !== false;
      if (this._isCastingShadow === normalizedValue) {
        return;
      }
      this._isCastingShadow = normalizedValue;
      this._renderer.updateShadowCasting();
    }
    updateShadowReceiving(value: boolean | undefined) {
      const normalizedValue = value !== false;
      if (this._isReceivingShadow === normalizedValue) {
        return;
      }
      this._isReceivingShadow = normalizedValue;
      this._renderer.updateShadowReceiving();
    }

    setCSGMode(mode: 'Box' | 'Combined'): void {
      const nextMode = mode === 'Combined' ? 'Combined' : 'Box';
      if (this._csgMode === nextMode) {
        return;
      }
      this._csgMode = nextMode;
      this._renderer.updateGeneratedGeometry();
    }

    getCSGMode(): 'Box' | 'Combined' {
      return this._csgMode;
    }

    setCSGRole(role: 'Solid' | 'Room' | 'Cutter'): void {
      const normalizedRole =
        role === 'Room' || role === 'Cutter' ? role : 'Solid';
      if (this._csgRole === normalizedRole) {
        return;
      }
      this._csgRole = normalizedRole;
      this._roomMode = normalizedRole === 'Room';
      if (normalizedRole === 'Room') {
        this._facesInward = true;
        this._generateCollision = true;
        this._csgOperation = 'Union';
      } else if (normalizedRole === 'Cutter') {
        this._facesInward = false;
        this._csgOperation = 'Subtract';
      } else {
        this._csgOperation = 'Union';
      }
      this._renderer.updateGeneratedGeometry();
    }

    getCSGRole(): 'Solid' | 'Room' | 'Cutter' {
      return this._csgRole;
    }

    setCSGOperation(operation: 'Union' | 'Subtract' | 'Intersect'): void {
      if (
        operation !== 'Union' &&
        operation !== 'Subtract' &&
        operation !== 'Intersect'
      ) {
        operation = 'Union';
      }
      if (this._csgOperation === operation) {
        return;
      }
      this._csgOperation = operation;
      if (operation === 'Subtract') {
        this._csgRole = 'Cutter';
        this._roomMode = false;
      } else if (this._csgRole === 'Cutter') {
        this._csgRole = 'Solid';
      }
      this._renderer.updateGeneratedGeometry();
    }

    getCSGOperation(): 'Union' | 'Subtract' | 'Intersect' {
      return this._csgOperation;
    }

    setRoomMode(enable: boolean): void {
      if (this._roomMode === enable) {
        return;
      }
      this._roomMode = enable;
      this._csgRole = enable ? 'Room' : 'Solid';
      this.setFacesInward(enable || this._facesInward);
      this.setCollisionGenerationEnabled(true);
    }

    isRoomModeEnabled(): boolean {
      return this._roomMode;
    }

    setFacesInward(enable: boolean): void {
      if (this._facesInward === enable) {
        return;
      }
      this._facesInward = enable;
      this._renderer.updateFaceOrientation();
    }

    areFacesInward(): boolean {
      return this._facesInward || this._roomMode;
    }

    flipFaces(): void {
      this.setFacesInward(!this.areFacesInward());
    }

    setWallThickness(wallThickness: float): void {
      this._wallThickness = Math.max(0, wallThickness || 0);
      this._renderer.updateGeneratedGeometry();
    }

    getWallThickness(): float {
      return this._wallThickness;
    }

    setCollisionGenerationEnabled(enable: boolean): void {
      if (this._generateCollision === enable) {
        return;
      }
      this._generateCollision = enable;
    }

    isCollisionGenerationEnabled(): boolean {
      return this._generateCollision;
    }

    setCollisionLayer(collisionLayer: float): void {
      this._collisionLayer = Math.max(0, Math.floor(collisionLayer || 0));
    }

    getCollisionLayer(): float {
      return this._collisionLayer;
    }

    setCollisionMask(collisionMask: float): void {
      this._collisionMask = Math.max(0, Math.floor(collisionMask || 0));
    }

    getCollisionMask(): float {
      return this._collisionMask;
    }

    setCollisionPriority(collisionPriority: float): void {
      this._collisionPriority = collisionPriority || 0;
    }

    getCollisionPriority(): float {
      return this._collisionPriority;
    }

    setCalculateTangentsEnabled(enable: boolean): void {
      if (this._calculateTangents === enable) {
        return;
      }
      this._calculateTangents = enable;
      this._renderer.updateGeneratedGeometry();
    }

    isCalculateTangentsEnabled(): boolean {
      return this._calculateTangents;
    }

    setAutoSmoothEnabled(enable: boolean): void {
      if (this._autoSmooth === enable) {
        return;
      }
      this._autoSmooth = enable;
      this._renderer.updateGeneratedGeometry();
    }

    isAutoSmoothEnabled(): boolean {
      return this._autoSmooth;
    }

    setSmoothingAngle(smoothingAngle: float): void {
      const normalizedAngle = Math.max(0, Math.min(180, smoothingAngle || 0));
      if (this._smoothingAngle === normalizedAngle) {
        return;
      }
      this._smoothingAngle = normalizedAngle;
      this._renderer.updateGeneratedGeometry();
    }

    getSmoothingAngle(): float {
      return this._smoothingAngle;
    }

    getCSGCollisionSurfaces(): Array<{
      name: string;
      x: float;
      y: float;
      z: float;
      width: float;
      height: float;
      depth: float;
      collisionLayer: float;
      collisionMask: float;
      collisionPriority: float;
    }> {
      if (!this._generateCollision) return [];

      const width = this.getWidth();
      const height = this.getHeight();
      const depth = this.getDepth();
      const thickness = this._roomMode
        ? Math.max(this._wallThickness, 0.001)
        : Math.min(width, height, depth);

      if (!this._roomMode) {
        return [
          {
            name: 'solid',
            x: this.getX(),
            y: this.getY(),
            z: this.getZ(),
            width,
            height,
            depth,
            collisionLayer: this._collisionLayer,
            collisionMask: this._collisionMask,
            collisionPriority: this._collisionPriority,
          },
        ];
      }

      return [
        {
          name: 'floor',
          x: this.getX(),
          y: this.getY(),
          z: this.getZ(),
          width,
          height: thickness,
          depth,
          collisionLayer: this._collisionLayer,
          collisionMask: this._collisionMask,
          collisionPriority: this._collisionPriority,
        },
        {
          name: 'ceiling',
          x: this.getX(),
          y: this.getY() + height - thickness,
          z: this.getZ(),
          width,
          height: thickness,
          depth,
          collisionLayer: this._collisionLayer,
          collisionMask: this._collisionMask,
          collisionPriority: this._collisionPriority,
        },
        {
          name: 'frontWall',
          x: this.getX(),
          y: this.getY(),
          z: this.getZ(),
          width,
          height,
          depth: thickness,
          collisionLayer: this._collisionLayer,
          collisionMask: this._collisionMask,
          collisionPriority: this._collisionPriority,
        },
        {
          name: 'backWall',
          x: this.getX(),
          y: this.getY(),
          z: this.getZ() + depth - thickness,
          width,
          height,
          depth: thickness,
          collisionLayer: this._collisionLayer,
          collisionMask: this._collisionMask,
          collisionPriority: this._collisionPriority,
        },
        {
          name: 'leftWall',
          x: this.getX(),
          y: this.getY(),
          z: this.getZ(),
          width: thickness,
          height,
          depth,
          collisionLayer: this._collisionLayer,
          collisionMask: this._collisionMask,
          collisionPriority: this._collisionPriority,
        },
        {
          name: 'rightWall',
          x: this.getX() + width - thickness,
          y: this.getY(),
          z: this.getZ(),
          width: thickness,
          height,
          depth,
          collisionLayer: this._collisionLayer,
          collisionMask: this._collisionMask,
          collisionPriority: this._collisionPriority,
        },
      ];
    }

    bakeStaticMesh(resultVariable: gdjs.Variable): void {
      resultVariable.clearChildren();
      resultVariable.getChild('type').setString('Box');
      resultVariable.getChild('x').setNumber(this.getX());
      resultVariable.getChild('y').setNumber(this.getY());
      resultVariable.getChild('z').setNumber(this.getZ());
      resultVariable.getChild('width').setNumber(this.getWidth());
      resultVariable.getChild('height').setNumber(this.getHeight());
      resultVariable.getChild('depth').setNumber(this.getDepth());
      resultVariable.getChild('facesInward').setBoolean(this.areFacesInward());
      resultVariable
        .getChild('calculateTangents')
        .setBoolean(this._calculateTangents);
      resultVariable.getChild('autoSmooth').setBoolean(this._autoSmooth);
      resultVariable.getChild('smoothingAngle').setNumber(this._smoothingAngle);
      resultVariable.getChild('materialType').setNumber(this._materialType);
    }

    bakeCollisionShape(resultVariable: gdjs.Variable): void {
      this.writeCollisionSurfaces(resultVariable);
      resultVariable.getChild('collisionLayer').setNumber(this._collisionLayer);
      resultVariable.getChild('collisionMask').setNumber(this._collisionMask);
      resultVariable
        .getChild('collisionPriority')
        .setNumber(this._collisionPriority);
    }

    writeCollisionSurfaces(resultVariable: gdjs.Variable): void {
      resultVariable.clearChildren();
      const surfaces = this.getCSGCollisionSurfaces();
      resultVariable.getChild('surfaceCount').setNumber(surfaces.length);
      const surfacesVariable = resultVariable.getChild('surfaces');

      for (let index = 0; index < surfaces.length; index++) {
        const surface = surfaces[index];
        const surfaceVariable = surfacesVariable.getChild(String(index));
        surfaceVariable.getChild('type').setString(surface.name);
        surfaceVariable.getChild('x').setNumber(surface.x);
        surfaceVariable.getChild('y').setNumber(surface.y);
        surfaceVariable.getChild('z').setNumber(surface.z);
        surfaceVariable.getChild('width').setNumber(surface.width);
        surfaceVariable.getChild('height').setNumber(surface.height);
        surfaceVariable.getChild('depth').setNumber(surface.depth);
        surfaceVariable.getChild('collisionLayer').setNumber(surface.collisionLayer);
        surfaceVariable.getChild('collisionMask').setNumber(surface.collisionMask);
        surfaceVariable
          .getChild('collisionPriority')
          .setNumber(surface.collisionPriority);
      }
    }
  }

  /** @category Objects > 3D Box */
  export namespace Cube3DRuntimeObject {
    export enum MaterialType {
      Basic,
      StandardWithoutMetalness,
      Matte,
      Standard,
      Glossy,
      Metallic,
    }
  }
  gdjs.registerObject('Scene3D::Cube3DObject', gdjs.Cube3DRuntimeObject);
}
