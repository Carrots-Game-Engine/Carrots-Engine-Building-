// @flow
import * as React from 'react';
import IconButton from '../IconButton';
import Cross from '../CustomSvgIcons/Cross';

const styles = {
  container: {
    padding: 0,
    width: 32,
    height: 32,
  },
  icon: {
    width: 16,
    height: 16,
  },
};

type Props = {|
  onClose?: () => void,
|};

/**
 * A simple close button. When used inside FlexLayout tabs,
 * the close behaviour is handled by FlexLayout itself,
 * so this component is mostly kept for backward-compat.
 */
export default function CloseButton({ onClose }: Props): React.Node {
  if (!onClose) return null;
  return (
    // $FlowFixMe[incompatible-type]
    <IconButton onClick={onClose} style={styles.container}>
      <Cross htmlColor="inherit" style={styles.icon} />
    </IconButton>
  );
}


