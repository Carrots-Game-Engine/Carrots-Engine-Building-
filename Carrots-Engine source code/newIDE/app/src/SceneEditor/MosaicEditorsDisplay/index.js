// @flow

import * as React from 'react';
import { t } from '@lingui/macro';
import { I18n } from '@lingui/react';

import PreferencesContext from '../../MainFrame/Preferences/PreferencesContext';
import EditorMosaic, {
  type EditorMosaicInterface,
} from '../../UI/EditorMosaic';
import InstancesEditor from '../../InstancesEditor';
import LayersList, { type LayersListInterface } from '../../LayersList';
import FullSizeInstancesEditorWithScrollbars from '../../InstancesEditor/FullSizeInstancesEditorWithScrollbars';
import CloseButton from '../../UI/EditorMosaic/CloseButton';
import ObjectsList, { type ObjectsListInterface } from '../../ObjectsList';
import ObjectGroupsList, {
  type ObjectGroupsListInterface,
} from '../../ObjectGroupsList';
import InstancesList, {
  type InstancesListInterface,
} from '../../InstancesEditor/InstancesList';
import ObjectsRenderingService from '../../ObjectsRendering/ObjectsRenderingService';
import ProjectResourcesPanel from '../ProjectResourcesPanel';
import EditorConsolePanel from '../EditorConsolePanel';
import BuildPanel from '../BuildPanel';
import ObjectsAndHierarchyPanel from '../ObjectsAndHierarchyPanel';

import Rectangle from '../../Utils/Rectangle';
import { type EditorId } from '../utils';
import {
  type SceneEditorsDisplayProps,
  type SceneEditorsDisplayInterface,
} from '../EditorsDisplay.flow';
import {
  InstanceOrObjectPropertiesEditorContainer,
  type InstanceOrObjectPropertiesEditorInterface,
} from '../../SceneEditor/InstanceOrObjectPropertiesEditorContainer';
import { useDoNowOrAfterRender } from '../../Utils/UseDoNowOrAfterRender';
import { preventGameFramePointerEvents } from '../../EmbeddedGame/EmbeddedGameFrame';
import { EmbeddedGameFrameHole } from '../../EmbeddedGame/EmbeddedGameFrameHole';

const SCENE_EDITOR_MOSAIC_LAYOUT_KEY = 'scene-editor-unity-layout-v1';

const initialMosaicEditorNodes = {
  direction: 'row',
  splitPercentage: 75,
  first: {
    direction: 'row',
    splitPercentage: 22,
    first: 'objects-and-hierarchy',
    second: 'instances-editor',
  },
  second: 'properties',
};

const noop = () => {};

const defaultPanelConfigByEditor = {
  'objects-and-hierarchy': {
    position: 'left',
  },
  properties: {
    position: 'right',
  },
  'objects-list': {
    position: 'left',
  },
  'object-groups-list': {
    position: 'left',
  },
  'instances-list': {
    position: 'left',
  },
  'layers-list': {
    position: 'left',
  },
  'project-resources': {
    position: 'bottom',
  },
  console: {
    position: 'bottom',
  },
  build: {
    position: 'bottom',
  },
};

// Forward ref to allow Scene editor to force update some editors
const MosaicEditorsDisplay: React.ComponentType<{
  ...SceneEditorsDisplayProps,
  +ref?: React.RefSetter<SceneEditorsDisplayInterface>,
}> = React.forwardRef<SceneEditorsDisplayProps, SceneEditorsDisplayInterface>(
  (props, ref) => {
    const {
      gameEditorMode,
      project,
      resourceManagementProps,
      layout,
      eventsFunctionsExtension,
      eventsBasedObject,
      eventsBasedObjectVariant,
      updateBehaviorsSharedData,
      layersContainer,
      globalObjectsContainer,
      objectsContainer,
      projectScopedContainersAccessor,
      initialInstances,
      chosenLayer,
      selectedLayer,
      onSelectInstances,
      onInstancesModified,
      onWillInstallExtension,
      onExtensionInstalled,
      isActive,
      onRestartInGameEditor,
      showRestartInGameEditorAfterErrorButton,
    } = props;
    const {
      getDefaultEditorMosaicNode,
      setDefaultEditorMosaicNode,
    } = React.useContext(PreferencesContext);
    const selectedInstances = props.instancesSelection.getSelectedInstances();

    const instanceOrObjectPropertiesEditorRef = React.useRef<?InstanceOrObjectPropertiesEditorInterface>(
      null
    );
    const layersListRef = React.useRef<?LayersListInterface>(null);
    const instancesListRef = React.useRef<?InstancesListInterface>(null);
    const editorRef = React.useRef<?InstancesEditor>(null);
    const objectsListRef = React.useRef<?ObjectsListInterface>(null);
    const editorMosaicRef = React.useRef<?EditorMosaicInterface>(null);
    const objectGroupsListRef = React.useRef<?ObjectGroupsListInterface>(null);
    const objectsAndHierarchyRef = React.useRef<?{|
      forceUpdateObjectsList: () => void,
      forceUpdateInstancesList: () => void,
    |}>(null);
    const objectsListDoNowOrAfterRender = useDoNowOrAfterRender<?ObjectsListInterface>(
      objectsListRef
    );

    const forceUpdatePropertiesEditor = React.useCallback(() => {
      if (instanceOrObjectPropertiesEditorRef.current)
        instanceOrObjectPropertiesEditorRef.current.forceUpdate();
    }, []);
    const forceUpdateInstancesList = React.useCallback(() => {
      if (instancesListRef.current) instancesListRef.current.forceUpdate();
    }, []);
    const forceUpdateObjectsList = React.useCallback(() => {
      if (objectsListRef.current) objectsListRef.current.forceUpdateList();
      if (objectsAndHierarchyRef.current)
        objectsAndHierarchyRef.current.forceUpdateObjectsList();
      if (instancesListRef.current) instancesListRef.current.forceUpdate();
    }, []);
    const forceUpdateObjectGroupsList = React.useCallback(() => {
      if (objectGroupsListRef.current)
        objectGroupsListRef.current.forceUpdate();
    }, []);
    const scrollObjectGroupsListToObjectGroup = React.useCallback(
      (objectGroup: gdObjectGroup) => {
        if (objectGroupsListRef.current)
          objectGroupsListRef.current.scrollToObjectGroup(objectGroup);
      },
      []
    );
    const forceUpdateLayersList = React.useCallback(() => {
      if (layersListRef.current) layersListRef.current.forceUpdateList();
    }, []);
    const getInstanceSize = React.useCallback((instance: gdInitialInstance) => {
      return editorRef.current
        ? editorRef.current.getInstanceSize(instance)
        : [
            instance.getDefaultWidth(),
            instance.getDefaultHeight(),
            instance.getDefaultDepth(),
          ];
    }, []);
    const _onInstancesModified = React.useCallback(
      // $FlowFixMe[missing-local-annot]
      instances => {
        if (onInstancesModified) onInstancesModified(instances);
        forceUpdateInstancesList();
      },
      [onInstancesModified, forceUpdateInstancesList]
    );
    const toggleEditorView = React.useCallback((editorId: EditorId) => {
      if (!editorMosaicRef.current) return;
      const config = defaultPanelConfigByEditor[editorId];
      // $FlowFixMe[incompatible-type]
      editorMosaicRef.current.toggleEditor(editorId, config.position);
    }, []);
    const isEditorVisible = React.useCallback((editorId: EditorId) => {
      if (!editorMosaicRef.current) return false;
      return editorMosaicRef.current.getOpenedEditorNames().includes(editorId);
    }, []);
    const ensureEditorVisible = React.useCallback(
      (editorId: EditorId) => {
        if (!isEditorVisible(editorId)) {
          toggleEditorView(editorId);
        }
      },
      [isEditorVisible, toggleEditorView]
    );

    const startSceneRendering = React.useCallback((start: boolean) => {
      const editor = editorRef.current;
      if (!editor) return;

      if (start) editor.restartSceneRendering();
      else editor.pauseSceneRendering();
    }, []);
    const openNewObjectDialog = React.useCallback(
      () => {
        if (!isEditorVisible('objects-and-hierarchy')) {
          toggleEditorView('objects-and-hierarchy');
        }

        objectsListDoNowOrAfterRender((objectsList: ?ObjectsListInterface) => {
          if (objectsList) objectsList.openNewObjectDialog();
        });
      },
      [isEditorVisible, toggleEditorView, objectsListDoNowOrAfterRender]
    );

    // $FlowFixMe[incompatible-type]
    React.useImperativeHandle(ref, () => {
      const { current: editor } = editorRef;
      return {
        getName: () => 'mosaic',
        forceUpdateInstancesList,
        forceUpdatePropertiesEditor,
        forceUpdateObjectsList,
        forceUpdateObjectGroupsList,
        scrollObjectGroupsListToObjectGroup,
        forceUpdateLayersList,
        openNewObjectDialog,
        toggleEditorView,
        isEditorVisible,
        ensureEditorVisible,
        startSceneRendering,
        viewControls: {
          zoomBy: editor ? editor.zoomBy : noop,
          setZoomFactor: editor ? editor.setZoomFactor : noop,
          zoomToInitialPosition: editor ? editor.zoomToInitialPosition : noop,
          zoomToFitContent: editor ? editor.zoomToFitContent : noop,
          zoomToFitSelection: editor ? editor.zoomToFitSelection : noop,
          centerViewOnLastInstance: editor
            ? editor.centerViewOnLastInstance
            : noop,
          getLastCursorSceneCoordinates: editor
            ? editor.getLastCursorSceneCoordinates
            : () => [0, 0],
          getLastContextMenuSceneCoordinates: editor
            ? editor.getLastContextMenuSceneCoordinates
            : () => [0, 0],
          getViewPosition: editor ? editor.getViewPosition : noop,
        },
        instancesHandlers: {
          getContentAABB: editor ? editor.getContentAABB : () => null,
          getSelectionAABB: editor
            ? editor.selectedInstances.getSelectionAABB
            : () => new Rectangle(),
          addInstances: editor ? editor.addInstances : () => [],
          clearHighlightedInstance: editor
            ? editor.clearHighlightedInstance
            : noop,
          resetInstanceRenderersFor: editor
            ? editor.resetInstanceRenderersFor
            : noop,
          forceRemountInstancesRenderers: editor ? editor.forceRemount : noop,
          addSerializedInstances: editor
            ? editor.addSerializedInstances
            : () => [],
          snapSelection: editor ? editor.snapSelection : noop,
        },
      };
    });

    const selectInstances = React.useCallback(
      (instances: Array<gdInitialInstance>, multiSelect: boolean) => {
        onSelectInstances(instances, multiSelect);
        forceUpdateInstancesList();
        forceUpdatePropertiesEditor();
      },
      [forceUpdateInstancesList, forceUpdatePropertiesEditor, onSelectInstances]
    );

    const selectedObjects = props.selectedObjectFolderOrObjectsWithContext
      .map(objectFolderOrObjectWithContext => {
        const { objectFolderOrObject } = objectFolderOrObjectWithContext;
        if (!objectFolderOrObject) return null; // Protect ourselves from an unexpected null value.
        if (objectFolderOrObject.isFolder()) return null;
        return objectFolderOrObject.getObject();
      })
      .filter(Boolean);

    const selectedObjectNames = selectedObjects.map(object => object.getName());

    const isCustomVariant = eventsBasedObject
      ? eventsBasedObject.getDefaultVariant() !== eventsBasedObjectVariant
      : false;

    const editors = {
      'objects-and-hierarchy': {
        type: 'secondary',
        title: t`Objects & Hierarchy`,
        toolbarControls: [],
        renderEditor: () => (
          <ObjectsAndHierarchyPanel
            project={project}
            layout={layout}
            eventsFunctionsExtension={eventsFunctionsExtension}
            eventsBasedObject={eventsBasedObject}
            eventsBasedObjectVariant={eventsBasedObjectVariant}
            globalObjectsContainer={globalObjectsContainer}
            objectsContainer={objectsContainer}
            layersContainer={layersContainer}
            initialInstances={initialInstances}
            instancesSelection={props.instancesSelection}
            selectedObjectFolderOrObjectsWithContext={
              props.selectedObjectFolderOrObjectsWithContext
            }
            resourceManagementProps={resourceManagementProps}
            unsavedChanges={props.unsavedChanges}
            hotReloadPreviewButtonProps={props.hotReloadPreviewButtonProps}
            onWillInstallExtension={onWillInstallExtension}
            onExtensionInstalled={onExtensionInstalled}
            onEditObject={props.onEditObject}
            onOpenEventBasedObjectEditor={props.onOpenEventBasedObjectEditor}
            onOpenEventBasedObjectVariantEditor={
              props.onOpenEventBasedObjectVariantEditor
            }
            onOpenTypeScriptScripts={props.onOpenTypeScriptScripts}
            onExportAssets={props.onExportAssets}
            onImportAssets={props.onImportAssets}
            onDeleteObjects={props.onDeleteObjects}
            getValidatedObjectOrGroupName={props.getValidatedObjectOrGroupName}
            onObjectCreated={props.onObjectCreated}
            onObjectEdited={props.onObjectEdited}
            onObjectFolderOrObjectWithContextSelected={
              props.onObjectFolderOrObjectWithContextSelected
            }
            onRenameObjectFolderOrObjectWithContextFinish={
              props.onRenameObjectFolderOrObjectWithContextFinish
            }
            onAddObjectInstance={props.onAddObjectInstance}
            onObjectPasted={props.updateBehaviorsSharedData}
            canObjectOrGroupBeGlobal={props.canObjectOrGroupBeGlobal}
            onSetAsGlobalObject={props.onSetAsGlobalObject}
            onSelectAllInstancesOfObjectInLayout={
              props.onSelectAllInstancesOfObjectInLayout
            }
            onInstancesSelected={props.onInstancesSelected}
            onInstancesModified={_onInstancesModified}
            onInstancesAdded={props.onInstancesAdded}
            onInstanceDoubleClicked={props.onInstanceDoubleClicked}
            onInstancesMoved={props.onInstancesMoved}
            onInstancesResized={props.onInstancesResized}
            onInstancesRotated={props.onInstancesRotated}
            canAdd2DObjectsToScene={props.canAdd2DObjectsToScene}
            canAdd3DObjectsToScene={props.canAdd3DObjectsToScene}
            isInstanceOf3DObject={props.isInstanceOf3DObject}
            onContextMenu={props.onContextMenu}
            tileMapTileSelection={props.tileMapTileSelection}
            onSelectTileMapTile={props.onSelectTileMapTile}
            projectScopedContainersAccessor={projectScopedContainersAccessor}
            isListLocked={isCustomVariant}
            onLayersModified={props.onLayersModified}
            onChooseLayer={props.onChooseLayer}
            onSelectLayer={props.onSelectLayer}
            onBackgroundColorChanged={props.onBackgroundColorChanged}
            gameEditorMode={props.gameEditorMode}
            ref={objectsAndHierarchyRef}
          />
        ),
      },
      properties: {
        type: 'secondary',
        title: t`Inspector`,
        toolbarControls: [],
        renderEditor: () => (
          <I18n>
            {({ i18n }) => (
              <InstanceOrObjectPropertiesEditorContainer
                i18n={i18n}
                project={project}
                resourceManagementProps={resourceManagementProps}
                layout={layout}
                eventsFunctionsExtension={eventsFunctionsExtension}
                onUpdateBehaviorsSharedData={updateBehaviorsSharedData}
                objectsContainer={objectsContainer}
                globalObjectsContainer={globalObjectsContainer}
                layersContainer={layersContainer}
                projectScopedContainersAccessor={
                  projectScopedContainersAccessor
                }
                initialInstances={initialInstances}
                instances={selectedInstances}
                objects={selectedObjects}
                layer={selectedLayer}
                editInstanceVariables={props.editInstanceVariables}
                editObjectInPropertiesPanel={props.editObjectInPropertiesPanel}
                onEditObject={props.onEditObject}
                onObjectsModified={props.onObjectsModified}
                onEffectAdded={props.onEffectAdded}
                onInstancesModified={_onInstancesModified}
                onGetInstanceSize={getInstanceSize}
                ref={instanceOrObjectPropertiesEditorRef}
                unsavedChanges={props.unsavedChanges}
                historyHandler={props.historyHandler}
                tileMapTileSelection={props.tileMapTileSelection}
                onSelectTileMapTile={props.onSelectTileMapTile}
                lastSelectionType={props.lastSelectionType}
                onWillInstallExtension={props.onWillInstallExtension}
                onExtensionInstalled={props.onExtensionInstalled}
                onOpenEventBasedObjectVariantEditor={
                  props.onOpenEventBasedObjectVariantEditor
                }
                onDeleteEventsBasedObjectVariant={
                  props.onDeleteEventsBasedObjectVariant
                }
                isVariableListLocked={isCustomVariant}
                isBehaviorListLocked={isCustomVariant}
                onEditLayerEffects={props.editLayerEffects}
                onEditLayer={props.editLayer}
                onLayersModified={props.onLayersModified}
                eventsBasedObject={props.eventsBasedObject}
                eventsBasedObjectVariant={props.eventsBasedObjectVariant}
                getContentAABB={
                  editorRef.current
                    ? editorRef.current.getContentAABB
                    : () => null
                }
                onEventsBasedObjectChildrenEdited={
                  props.onEventsBasedObjectChildrenEdited
                }
              />
            )}
          </I18n>
        ),
      },
      'layers-list': {
        type: 'secondary',
        title: t`Layers`,
        renderEditor: () => (
          <LayersList
            project={project}
            layout={layout}
            eventsFunctionsExtension={eventsFunctionsExtension}
            eventsBasedObject={eventsBasedObject}
            chosenLayer={chosenLayer}
            onChooseLayer={props.onChooseLayer}
            selectedLayer={selectedLayer}
            onSelectLayer={props.onSelectLayer}
            onEditLayerEffects={props.editLayerEffects}
            onEditLayer={props.editLayer}
            onLayersModified={props.onLayersModified}
            onLayersVisibilityInEditorChanged={
              props.onLayersVisibilityInEditorChanged
            }
            onRemoveLayer={props.onRemoveLayer}
            onLayerRenamed={props.onLayerRenamed}
            onCreateLayer={forceUpdatePropertiesEditor}
            layersContainer={layersContainer}
            ref={layersListRef}
            hotReloadPreviewButtonProps={props.hotReloadPreviewButtonProps}
            onBackgroundColorChanged={props.onBackgroundColorChanged}
            gameEditorMode={props.gameEditorMode}
          />
        ),
      },
      'instances-list': {
        type: 'secondary',
        title: t`Hierarchy`,
        toolbarControls: [],
        renderEditor: () => (
          <InstancesList
            instances={initialInstances}
            selectedInstances={selectedInstances}
            onSelectInstances={selectInstances}
            onInstancesModified={onInstancesModified || noop}
            ref={instancesListRef}
          />
        ),
      },
      'instances-editor':
        gameEditorMode === 'embedded-game'
          ? {
              type: 'primary',
              noTitleBar: true,
              noSoftKeyboardAvoidance: true,
              renderEditor: () => (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                  }}
                >
                  <EmbeddedGameFrameHole
                    isActive={isActive}
                    onRestartInGameEditor={onRestartInGameEditor}
                    showRestartInGameEditorAfterErrorButton={
                      showRestartInGameEditorAfterErrorButton
                    }
                  />
                  {props.embeddedEditorOverlay || null}
                </div>
              ),
            }
          : {
              type: 'primary',
              noTitleBar: true,
              noSoftKeyboardAvoidance: true,
              renderEditor: () => (
                <FullSizeInstancesEditorWithScrollbars
                  project={project}
                  layout={layout}
                  eventsBasedObject={eventsBasedObject}
                  eventsBasedObjectVariant={eventsBasedObjectVariant}
                  globalObjectsContainer={globalObjectsContainer}
                  objectsContainer={objectsContainer}
                  layersContainer={layersContainer}
                  chosenLayer={chosenLayer}
                  initialInstances={initialInstances}
                  instancesEditorSettings={props.instancesEditorSettings}
                  onInstancesEditorSettingsMutated={
                    props.onInstancesEditorSettingsMutated
                  }
                  instancesSelection={props.instancesSelection}
                  onInstancesAdded={props.onInstancesAdded}
                  onInstancesSelected={props.onInstancesSelected}
                  onInstanceDoubleClicked={props.onInstanceDoubleClicked}
                  onInstancesMoved={props.onInstancesMoved}
                  onInstancesResized={props.onInstancesResized}
                  onInstancesRotated={props.onInstancesRotated}
                  canAdd2DObjectsToScene={props.canAdd2DObjectsToScene}
                  canAdd3DObjectsToScene={props.canAdd3DObjectsToScene}
                  selectedObjectNames={selectedObjectNames}
                  onContextMenu={props.onContextMenu}
                  isInstanceOf3DObject={props.isInstanceOf3DObject}
                  instancesEditorShortcutsCallbacks={
                    props.instancesEditorShortcutsCallbacks
                  }
                  wrappedEditorRef={editor => {
                    editorRef.current = editor;
                  }}
                  pauseRendering={!props.isActive}
                  tileMapTileSelection={props.tileMapTileSelection}
                  onSelectTileMapTile={props.onSelectTileMapTile}
                  editorViewPosition2D={props.editorViewPosition2D}
                />
              ),
            },
      'objects-list': {
        type: 'secondary',
        title: t`Objects`,
        toolbarControls: [<CloseButton key="close" />],
        renderEditor: () => (
          <I18n>
            {({ i18n }) => (
              <ObjectsList
                getThumbnail={ObjectsRenderingService.getThumbnail.bind(
                  ObjectsRenderingService
                )}
                project={project}
                layout={layout}
                eventsFunctionsExtension={eventsFunctionsExtension}
                eventsBasedObject={eventsBasedObject}
                projectScopedContainersAccessor={
                  projectScopedContainersAccessor
                }
                globalObjectsContainer={globalObjectsContainer}
                objectsContainer={objectsContainer}
                initialInstances={initialInstances}
                onSelectAllInstancesOfObjectInLayout={
                  props.onSelectAllInstancesOfObjectInLayout
                }
                resourceManagementProps={props.resourceManagementProps}
                selectedObjectFolderOrObjectsWithContext={
                  props.selectedObjectFolderOrObjectsWithContext
                }
                onEditObject={props.onEditObject}
                onOpenEventBasedObjectEditor={
                  props.onOpenEventBasedObjectEditor
                }
                onOpenEventBasedObjectVariantEditor={
                  props.onOpenEventBasedObjectVariantEditor
                }
                onOpenTypeScriptScripts={props.onOpenTypeScriptScripts}
                onExportAssets={props.onExportAssets}
                onImportAssets={props.onImportAssets}
                onDeleteObjects={(objectWithContext, cb) =>
                  props.onDeleteObjects(i18n, objectWithContext, cb)
                }
                getValidatedObjectOrGroupName={(newName, global) =>
                  props.getValidatedObjectOrGroupName(newName, global, i18n)
                }
                onObjectCreated={props.onObjectCreated}
                onObjectEdited={props.onObjectEdited}
                onObjectFolderOrObjectWithContextSelected={
                  props.onObjectFolderOrObjectWithContextSelected
                }
                onRenameObjectFolderOrObjectWithContextFinish={
                  props.onRenameObjectFolderOrObjectWithContextFinish
                }
                onAddObjectInstance={props.onAddObjectInstance}
                onObjectPasted={props.updateBehaviorsSharedData}
                beforeSetAsGlobalObject={objectName =>
                  props.canObjectOrGroupBeGlobal(i18n, objectName)
                }
                onSetAsGlobalObject={props.onSetAsGlobalObject}
                ref={objectsListRef}
                unsavedChanges={props.unsavedChanges}
                hotReloadPreviewButtonProps={props.hotReloadPreviewButtonProps}
                isListLocked={isCustomVariant}
                onWillInstallExtension={onWillInstallExtension}
                onExtensionInstalled={onExtensionInstalled}
              />
            )}
          </I18n>
        ),
      },
      'project-resources': {
        type: 'secondary',
        title: t`Project`,
        renderEditor: () => (
          <ProjectResourcesPanel
            project={project}
            resourceManagementProps={resourceManagementProps}
            fileMetadata={null}
            unsavedChanges={props.unsavedChanges}
          />
        ),
      },
      console: {
        type: 'secondary',
        title: t`Console`,
        renderEditor: () => <EditorConsolePanel />,
      },
      build: {
        type: 'secondary',
        title: t`Build`,
        renderEditor: () => <BuildPanel />,
      },
      'object-groups-list': {
        type: 'secondary',
        title: t`Object Groups`,
        renderEditor: () => (
          <I18n>
            {({ i18n }) => (
              <ObjectGroupsList
                ref={objectGroupsListRef}
                globalObjectGroups={
                  globalObjectsContainer &&
                  globalObjectsContainer.getObjectGroups()
                }
                projectScopedContainersAccessor={
                  projectScopedContainersAccessor
                }
                objectGroups={objectsContainer.getObjectGroups()}
                onCreateGroup={props.onCreateObjectGroup}
                onEditGroup={props.onEditObjectGroup}
                onDeleteGroup={props.onDeleteObjectGroup}
                onRenameGroup={props.onRenameObjectGroup}
                getValidatedObjectOrGroupName={(newName, global) =>
                  props.getValidatedObjectOrGroupName(newName, global, i18n)
                }
                beforeSetAsGlobalGroup={groupName =>
                  props.canObjectOrGroupBeGlobal(i18n, groupName)
                }
                unsavedChanges={props.unsavedChanges}
                isListLocked={isCustomVariant}
              />
            )}
          </I18n>
        ),
      },
    };

    return (
      <EditorMosaic
        // $FlowFixMe[incompatible-type]
        editors={editors}
        centralNodeId="instances-editor"
        initialNodes={
          // $FlowFixMe[incompatible-type]
          getDefaultEditorMosaicNode(SCENE_EDITOR_MOSAIC_LAYOUT_KEY) ||
          initialMosaicEditorNodes
        }
        isTransparent={gameEditorMode === 'embedded-game'}
        onDragOrResizedStarted={() => {
          preventGameFramePointerEvents(true);
        }}
        onDragOrResizedEnded={() => {
          preventGameFramePointerEvents(false);
        }}
        onOpenedEditorsChanged={props.onOpenedEditorsChanged}
        onPersistNodes={node =>
          setDefaultEditorMosaicNode(SCENE_EDITOR_MOSAIC_LAYOUT_KEY, node)
        }
        ref={editorMosaicRef}
      />
    );
  }
);

export default MosaicEditorsDisplay;
