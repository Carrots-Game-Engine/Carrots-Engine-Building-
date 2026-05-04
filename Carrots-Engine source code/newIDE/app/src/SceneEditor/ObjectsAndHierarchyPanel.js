// @flow
import * as React from 'react';
import { Trans } from '@lingui/macro';
import MUITabs from '@material-ui/core/Tabs';
import MUITab from '@material-ui/core/Tab';
import ObjectsList, { type ObjectsListInterface } from '../ObjectsList';
import InstancesList, {
  type InstancesListInterface,
} from '../InstancesEditor/InstancesList';
import ObjectsRenderingService from '../ObjectsRendering/ObjectsRenderingService';
import { type ObjectFolderOrObjectWithContext } from '../ObjectsList/EnumerateObjectFolderOrObject';
import { type UnsavedChanges } from '../MainFrame/UnsavedChangesContext';
import { type HotReloadPreviewButtonProps } from '../HotReload/HotReloadPreviewButton';
import { type ResourceManagementProps } from '../ResourcesList/ResourceSource';

type Props = {|
  project: gdProject,
  layout: gdLayout,
  eventsFunctionsExtension: ?gdEventsFunctionsExtension,
  eventsBasedObject: ?gdEventsBasedObject,
  eventsBasedObjectVariant: ?gdEventsBasedObjectVariant,
  globalObjectsContainer: gdObjectsContainer,
  objectsContainer: gdObjectsContainer,
  layersContainer: gdLayersContainer,
  initialInstances: gdInitialInstancesContainer,
  instancesSelection: Object,
  selectedObjectFolderOrObjectsWithContext: Array<{|
    objectFolderOrObject: ?ObjectFolderOrObjectWithContext,
  |}>,
  resourceManagementProps: ResourceManagementProps,
  unsavedChanges: UnsavedChanges,
  hotReloadPreviewButtonProps: HotReloadPreviewButtonProps,
  onWillInstallExtension: () => void,
  onExtensionInstalled: () => void,
  onEditObject: (ObjectWithContext: ObjectWithContext) => void,
  onOpenEventBasedObjectEditor: (gdEventsBasedObject) => void,
  onOpenEventBasedObjectVariantEditor: (
    gdEventsBasedObject,
    gdEventsBasedObjectVariant
  ) => void,
  onOpenTypeScriptScripts: () => void,
  onExportAssets: () => void,
  onImportAssets: () => void,
  onDeleteObjects: (
    i18n: I18nType,
    ObjectWithContext: ObjectWithContext,
    () => void
  ) => void,
  getValidatedObjectOrGroupName: (string, boolean, I18nType) => string,
  onObjectCreated: () => void,
  onObjectEdited: () => void,
  onObjectFolderOrObjectWithContextSelected: ({|
    objectFolderOrObject: ?ObjectFolderOrObjectWithContext,
  |}) => void,
  onRenameObjectFolderOrObjectWithContextFinish: () => void,
  onAddObjectInstance: () => void,
  onObjectPasted: () => void,
  canObjectOrGroupBeGlobal: (I18nType, string) => boolean,
  onSetAsGlobalObject: (string) => void,
  onSelectAllInstancesOfObjectInLayout: (string) => void,
  onInstancesSelected: (Array<gdInitialInstance>, boolean) => void,
  onInstancesAdded: (Array<gdInitialInstance>) => void,
  onInstanceDoubleClicked: (gdInitialInstance) => void,
  onInstancesMoved: () => void,
  onInstancesResized: () => void,
  onInstancesRotated: () => void,
  canAdd2DObjectsToScene: boolean,
  canAdd3DObjectsToScene: boolean,
  isInstanceOf3DObject: (gdInitialInstance) => boolean,
  onContextMenu: (any, any, any) => void,
  tileMapTileSelection: ?Object,
  onSelectTileMapTile: ?Function,
  projectScopedContainersAccessor: Object,
  isListLocked: boolean,
  onLayersModified: () => void,
  onChooseLayer: (gdLayer) => void,
  onSelectLayer: (gdLayer) => void,
  onBackgroundColorChanged: (string) => void,
  gameEditorMode: 'embedded-game' | 'instances-editor',
  onInstancesModified?: (Array<gdInitialInstance>) => void,
|};

type TabType = 'hierarchy' | 'objects';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#1e1e24',
  },
  tabBar: {
    minHeight: 32,
    backgroundColor: '#2a2a35',
    borderBottom: '1px solid #3a3a4a',
  },
  tab: {
    minHeight: 32,
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'none',
    letterSpacing: '0.02em',
    color: '#a0a0b0',
    padding: '0 12px',
  },
  selectedTab: {
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#1e1e24',
  },
};

const ObjectsAndHierarchyPanel = React.forwardRef(
  (props: Props, ref) => {
    const [activeTab, setActiveTab] = React.useState<TabType>('hierarchy');
    const objectsListRef = React.useRef<?ObjectsListInterface>(null);
    const instancesListRef = React.useRef<?InstancesListInterface>(null);

    React.useImperativeHandle(ref, () => ({
      forceUpdateObjectsList: () => {
        if (objectsListRef.current) objectsListRef.current.forceUpdateList();
      },
      forceUpdateInstancesList: () => {
        if (instancesListRef.current) instancesListRef.current.forceUpdate();
      },
    }));

    const {
      project,
      layout,
      eventsFunctionsExtension,
      eventsBasedObject,
      eventsBasedObjectVariant,
      globalObjectsContainer,
      objectsContainer,
      layersContainer,
      initialInstances,
      instancesSelection,
      selectedObjectFolderOrObjectsWithContext,
      resourceManagementProps,
      unsavedChanges,
      hotReloadPreviewButtonProps,
      onWillInstallExtension,
      onExtensionInstalled,
    } = props;

    const selectedInstances = instancesSelection.getSelectedInstances();

    const selectInstances = React.useCallback(
      (instances, multiSelect) => {
        props.onInstancesSelected(instances, multiSelect);
      },
      [props.onInstancesSelected]
    );

    const handleTabChange = (event, newValue) => {
      setActiveTab(newValue);
    };

    return (
      <div style={styles.container}>
        <MUITabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          style={styles.tabBar}
        >
          <MUITab
            value="hierarchy"
            label={<Trans>Hierarchy</Trans>}
            style={{
              ...styles.tab,
              ...(activeTab === 'hierarchy' ? styles.selectedTab : {}),
            }}
          />
          <MUITab
            value="objects"
            label={<Trans>Objects</Trans>}
            style={{
              ...styles.tab,
              ...(activeTab === 'objects' ? styles.selectedTab : {}),
            }}
          />
        </MUITabs>
        <div style={styles.content}>
          <div
            style={{
              display: activeTab === 'hierarchy' ? 'flex' : 'none',
              height: '100%',
              flexDirection: 'column',
            }}
          >
            <InstancesList
              instances={initialInstances}
              selectedInstances={selectedInstances}
              onSelectInstances={selectInstances}
              onInstancesModified={props.onInstancesModified || (() => {})}
              ref={instancesListRef}
            />
          </div>
          <div
            style={{
              display: activeTab === 'objects' ? 'flex' : 'none',
              height: '100%',
              flexDirection: 'column',
            }}
          >
            <ObjectsList
              getThumbnail={ObjectsRenderingService.getThumbnail.bind(
                ObjectsRenderingService
              )}
              project={project}
              layout={layout}
              eventsFunctionsExtension={eventsFunctionsExtension}
              eventsBasedObject={eventsBasedObject}
              projectScopedContainersAccessor={
                props.projectScopedContainersAccessor
              }
              globalObjectsContainer={globalObjectsContainer}
              objectsContainer={objectsContainer}
              initialInstances={initialInstances}
              onSelectAllInstancesOfObjectInLayout={
                props.onSelectAllInstancesOfObjectInLayout
              }
              resourceManagementProps={resourceManagementProps}
              selectedObjectFolderOrObjectsWithContext={
                props.selectedObjectFolderOrObjectsWithContext
              }
              onEditObject={props.onEditObject}
              onOpenEventBasedObjectEditor={props.onOpenEventBasedObjectEditor}
              onOpenEventBasedObjectVariantEditor={
                props.onOpenEventBasedObjectVariantEditor
              }
              onOpenTypeScriptScripts={props.onOpenTypeScriptScripts}
              onExportAssets={props.onExportAssets}
              onImportAssets={props.onImportAssets}
              onDeleteObjects={(objectWithContext, cb) =>
                props.onDeleteObjects(
                  { _: (msg) => msg },
                  objectWithContext,
                  cb
                )
              }
              getValidatedObjectOrGroupName={(newName, global) =>
                props.getValidatedObjectOrGroupName(
                  newName,
                  global,
                  { _: (msg) => msg }
                )
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
              onObjectPasted={props.onObjectPasted}
              beforeSetAsGlobalObject={(objectName) =>
                props.canObjectOrGroupBeGlobal(
                  { _: (msg) => msg },
                  objectName
                )
              }
              onSetAsGlobalObject={props.onSetAsGlobalObject}
              ref={objectsListRef}
              unsavedChanges={unsavedChanges}
              hotReloadPreviewButtonProps={hotReloadPreviewButtonProps}
              isListLocked={props.isListLocked}
              onWillInstallExtension={onWillInstallExtension}
              onExtensionInstalled={onExtensionInstalled}
            />
          </div>
        </div>
      </div>
    );
  }
);

export default ObjectsAndHierarchyPanel;
