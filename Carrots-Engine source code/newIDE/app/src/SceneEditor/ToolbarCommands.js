// @flow
import { useCommand } from '../CommandPalette/CommandHooks';

type Props = {|
  undo: () => void,
  canUndo: boolean,
  redo: () => void,
  canRedo: boolean,
  deleteSelection: () => void,
  canDeleteSelection: boolean,
  toggleWindowMask: () => void,
  toggleGrid: () => void,
  setupGrid: () => void,
  onOpenSceneVariables: () => void,
|};

const ToolbarCommands = (props: Props): null => {
  useCommand('SCENE_EDITOR_UNDO', props.canUndo, {
    handler: props.undo,
  });

  useCommand('SCENE_EDITOR_REDO', props.canRedo, {
    handler: props.redo,
  });

  useCommand('DELETE_INSTANCES', props.canDeleteSelection, {
    handler: props.deleteSelection,
  });

  useCommand('TOGGLE_WINDOW_MASK', true, {
    handler: props.toggleWindowMask,
  });

  useCommand('TOGGLE_GRID', true, {
    handler: props.toggleGrid,
  });

  useCommand('OPEN_SETUP_GRID', true, {
    handler: props.setupGrid,
  });

  useCommand('OPEN_SCENE_VARIABLES', true, {
    handler: props.onOpenSceneVariables,
  });

  return null;
};

export default ToolbarCommands;
