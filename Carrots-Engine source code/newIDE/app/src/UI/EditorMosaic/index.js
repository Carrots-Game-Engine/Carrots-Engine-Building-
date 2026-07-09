// @flow
import * as React from 'react';
import * as FlexLayout from 'flexlayout-react';
import 'flexlayout-react/style/dark.css';
import './style.css';
import { I18n } from '@lingui/react';

export type Direction = 'row' | 'column';

export type EditorMosaicNode = any; // Loosened for FlexLayout JSON

export type EditorMosaicInterface = {|
  getOpenedEditorNames: () => Array<string>,
  toggleEditor: (
    editorName: string,
    position: 'left' | 'right' | 'bottom'
  ) => boolean,
  collapseEditor: (editorName: string) => boolean,
  uncollapseEditor: (
    editorName: string,
    defaultSplitPercentage: number
  ) => boolean,
|};

type Editor = {|
  type: 'primary' | 'secondary',
  noTitleBar?: boolean,
  title?: React.Node,
  renderEditor: () => React.Node,
  toolbarControls?: Array<React.Node>,
  noSoftKeyboardAvoidance?: boolean,
|};

type Props = {|
  editors: { [string]: Editor },
  centralNodeId?: string,
  initialNodes: ?EditorMosaicNode,
  onOpenedEditorsChanged?: (openedEditors: Array<string>) => void,
  onPersistNodes?: (node: EditorMosaicNode) => void,
  onDragOrResizedStarted?: () => void,
  onDragOrResizedEnded?: () => void,
  isTransparent?: boolean,
|};

const convertLegacyNodesToFlexLayout = (node: ?any): any => {
  if (!node) return { type: 'tabset', children: [] };
  if (node.global && node.layout) return node.layout;

  if (typeof node === 'string') {
    return {
      type: 'tabset',
      weight: 100,
      children: [{ type: 'tab', id: node, name: node, component: node }],
    };
  }
  
  if (Array.isArray(node)) {
    return {
      type: 'tabset',
      weight: 100,
      children: node.map(n => ({ type: 'tab', id: n, name: n, component: n }))
    };
  }

  return {
    type: node.direction,
    weight: node.splitPercentage || 50,
    children: [
      convertLegacyNodesToFlexLayout(node.first),
      convertLegacyNodesToFlexLayout(node.second),
    ],
  };
};

const EditorMosaic: React.ComponentType<{
  ...Props,
  +ref?: React.RefSetter<EditorMosaicInterface>,
}> = React.forwardRef<Props, EditorMosaicInterface>(
  (
    {
      initialNodes,
      centralNodeId,
      editors,
      onOpenedEditorsChanged,
      onPersistNodes,
      onDragOrResizedStarted,
      onDragOrResizedEnded,
      isTransparent,
    },
    ref
  ) => {
    const [model, setModel] = React.useState(() => {
      let json = initialNodes;
      if (!json || !json.global) {
        json = {
          global: {
            tabEnableClose: true,
            tabEnableRename: false,
            tabSetEnableMaximize: true,
            splitterSize: 4,
            tabSetTabStripHeight: 35
          },
          borders: [],
          layout: convertLegacyNodesToFlexLayout(initialNodes)
        };
      }
      return FlexLayout.Model.fromJson(json);
    });

    React.useImperativeHandle(ref, () => ({
      getOpenedEditorNames: (): Array<string> => {
        const names = [];
        model.visitNodes((n) => {
          if (n.getType() === 'tab') names.push(n.getComponent());
        });
        return names;
      },
      toggleEditor: (editorName: string, position: 'left' | 'right' | 'bottom') => {
        let isOpened = false;
        model.visitNodes((n) => {
          if (n.getType() === 'tab' && n.getComponent() === editorName) {
            isOpened = true;
          }
        });

        if (isOpened) {
          model.doAction(FlexLayout.Actions.deleteTab(editorName));
          return false;
        } else {
          model.doAction(FlexLayout.Actions.addNode({
            type: 'tab',
            id: editorName,
            name: editorName,
            component: editorName
          }, 'root', FlexLayout.DockLocation.BOTTOM, -1));
          return true;
        }
      },
      collapseEditor: (editorName: string) => false,
      uncollapseEditor: (editorName: string, defaultSplitPercentage: number) => false,
    }));

    const factory = (node: any) => {
      const component = node.getComponent();
      const editor = editors[component];
      if (!editor) return null;
      return editor.renderEditor();
    };

    const onModelChange = () => {
      if (onOpenedEditorsChanged) {
        const names = [];
        model.visitNodes((n) => {
          if (n.getType() === 'tab') names.push(n.getComponent());
        });
        onOpenedEditorsChanged(names);
      }
      if (onPersistNodes) {
        onPersistNodes(model.toJson());
      }
    };

    const onRenderTab = (node: any, renderState: any) => {
      const component = node.getComponent();
      const editor = editors[component];
      if (editor && editor.title) {
        renderState.content = (
          <I18n>
            {({ i18n }) => (
              <span className="flexlayout__tab_button_content">
                {typeof editor.title === 'object' && editor.title !== null && !React.isValidElement(editor.title) 
                  ? i18n._(editor.title) 
                  : editor.title}
              </span>
            )}
          </I18n>
        );
      }
      if (editor && editor.toolbarControls) {
        renderState.buttons = editor.toolbarControls.map((Control, i) => <div key={i}>{Control}</div>);
      }
    };

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#1c1d20' }}>
        <FlexLayout.Layout
          model={model}
          factory={factory}
          onModelChange={onModelChange}
          onRenderTab={onRenderTab}
          classNameMapper={(c) => isTransparent ? c + ' transparent' : c}
        />
      </div>
    );
  }
);

/**
 * Check if a node with the given name exists in the layout tree.
 * Works with both legacy mosaic nodes and FlexLayout JSON.
 */
export const mosaicContainsNode = (
  node: ?EditorMosaicNode,
  nodeName: string
): boolean => {
  if (!node) return false;
  if (typeof node === 'string') return node === nodeName;
  if (Array.isArray(node)) return node.includes(nodeName);

  // FlexLayout JSON format
  if (node.global && node.layout) {
    return mosaicContainsNode(node.layout, nodeName);
  }
  if (node.children) {
    return node.children.some(child => mosaicContainsNode(child, nodeName));
  }

  // Legacy mosaic format
  if (node.first && node.second) {
    return (
      mosaicContainsNode(node.first, nodeName) ||
      mosaicContainsNode(node.second, nodeName)
    );
  }

  // Tab node
  if (node.component === nodeName || node.id === nodeName) return true;

  return false;
};

export default EditorMosaic;
