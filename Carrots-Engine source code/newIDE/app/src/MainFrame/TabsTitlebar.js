// @flow
import * as React from 'react';
import { t } from '@lingui/macro';

import {
  TitleBarLeftSafeMargins,
  TitleBarRightSafeMargins,
} from '../UI/TitleBarSafeMargins';
import { type EditorTab } from './EditorTabs/EditorTabsHandler';
import { getTabId } from './EditorTabs/DraggableEditorTabs';
import { useScreenType } from '../UI/Responsive/ScreenTypeMeasurer';
import TabsTitlebarTooltip from './TabsTitlebarTooltip';
import Window from '../Utils/Window';
import { isMacLike } from '../Utils/Platform';
import GDevelopThemeContext from '../UI/Theme/GDevelopThemeContext';
import ElementWithMenu from '../UI/Menu/ElementWithMenu';
import CompactSearchBar from '../UI/CompactSearchBar';
import { type MenuItemTemplate } from '../UI/Menu/Menu.flow';
import {
  adaptFromDeclarativeTemplate,
  buildMainMenuDeclarativeTemplate,
  type MainMenuCallbacks,
  type BuildMainMenuProps,
} from './MainMenu';
import optionalRequire from '../Utils/OptionalRequire';
const electron = optionalRequire('electron');

const WINDOW_DRAGGABLE_PART_CLASS_NAME = 'title-bar-draggable-part';
const WINDOW_NON_DRAGGABLE_PART_CLASS_NAME = 'title-bar-non-draggable-part';

// ─── Carrots Engine Menu Bar Styles ─────────────────────────────────────────
const MENUBAR_BG = '#1b1c1f';
const MENUBAR_TEXT = '#b8bcc4';
const MENUBAR_TEXT_HOVER = '#e0e2e8';
const MENUBAR_HOVER_BG = '#2a2b30';
const MENUBAR_ACTIVE_ACCENT = '#e8914a';
const MENUBAR_SEPARATOR = 'rgba(255,255,255,0.06)';
const MENUBAR_HEIGHT = 36;

const styles = {
  container: {
    display: 'flex',
    flexShrink: 0,
    alignItems: 'center',
    position: 'relative',
    height: MENUBAR_HEIGHT,
    minHeight: MENUBAR_HEIGHT,
    background: MENUBAR_BG,
    borderBottom: `1px solid rgba(0,0,0,0.4)`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.28)',
    paddingRight: 4,
    userSelect: 'none',
    zIndex: 10,
  },
  menuItemsRow: {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    gap: 0,
    flexShrink: 0,
    paddingLeft: 6,
  },
  searchContainer: {
    width: 200,
    minWidth: 130,
    maxWidth: 240,
    marginLeft: 10,
    marginRight: 6,
    flexShrink: 1,
  },
};

// ─── Inline CarrotLogo SVG ──────────────────────────────────────────────────
function CarrotLogo(): React.MixedElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 64 64"
      fill="none"
      style={{ display: 'block' }}
    >
      {/* Carrot body */}
      <path
        d="M32 58L14 26C14 26 18 8 32 8C46 8 50 26 50 26L32 58Z"
        fill="#e8914a"
      />
      {/* Highlight */}
      <path
        d="M28 18C28 18 24 28 26 40L32 54L22 30C22 30 24 16 28 18Z"
        fill="#f4a96a"
        opacity="0.5"
      />
      {/* Leaf */}
      <path
        d="M32 8C32 8 26 2 20 4C26 6 28 8 32 8Z"
        fill="#5cb85c"
      />
      <path
        d="M32 8C32 8 38 2 44 4C38 6 36 8 32 8Z"
        fill="#4cae4c"
      />
    </svg>
  );
}

// ─── Custom menu bar button ─────────────────────────────────────────────────
type MenuBarButtonProps = {|
  label: string,
  icon?: React.Node,
  isActive?: boolean,
  isBrandItem?: boolean,
  onClick?: () => void,
|};

const MenuBarButton = React.forwardRef<MenuBarButtonProps, any>(
  ({ label, icon, isActive, isBrandItem, onClick, ...rest }: MenuBarButtonProps, ref) => {
    const [hovered, setHovered] = React.useState(false);

    const buttonStyle: Object = {
      display: 'flex',
      alignItems: 'center',
      gap: icon ? 6 : 0,
      height: 26,
      padding: isBrandItem ? '0 12px 0 8px' : '0 10px',
      margin: '0 1px',
      borderRadius: 5,
      border: 'none',
      outline: 'none',
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: isBrandItem ? 600 : 500,
      fontFamily: "'Segoe UI', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      letterSpacing: '0.01em',
      whiteSpace: 'nowrap',
      background: hovered
        ? MENUBAR_HOVER_BG
        : isActive
        ? 'rgba(232, 145, 74, 0.12)'
        : 'transparent',
      color: isActive
        ? MENUBAR_ACTIVE_ACCENT
        : hovered
        ? MENUBAR_TEXT_HOVER
        : MENUBAR_TEXT,
      transition: 'background 150ms ease, color 150ms ease',
      WebkitAppRegion: 'no-drag',
    };

    return (
      <button
        ref={ref}
        style={buttonStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onClick}
        {...rest}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  }
);

// ─── Separator ──────────────────────────────────────────────────────────────
function MenuSeparator(): React.MixedElement {
  return (
    <span
      style={{
        width: 1,
        height: 16,
        background: MENUBAR_SEPARATOR,
        margin: '0 3px',
        flexShrink: 0,
      }}
    />
  );
}

export type TabsTitlebarQuickAccessMenu = {|
  label: string,
  submenu: Array<MenuItemTemplate>,
|};

type TabsTitlebarProps = {|
  hidden: boolean,
  mainMenuCallbacks: MainMenuCallbacks,
  buildMainMenuProps: BuildMainMenuProps,
  quickAccessMenus: Array<TabsTitlebarQuickAccessMenu>,
  onSearchInProject: (query: string) => void,
  renderTabs: (
    onEditorTabHovered: (?EditorTab, {| isLabelTruncated: boolean |}) => void,
    onEditorTabClosing: () => void
  ) => React.Node,
  isLeftMostPane: boolean,
  isRightMostPane: boolean,
  displayMenuIcon: boolean,

  displayAskAi: boolean,
  onAskAiClicked: () => void,
|};

/**
 * The titlebar containing a menu, the tabs and giving space for window controls.
 */
export default function TabsTitlebar({
  hidden,
  mainMenuCallbacks,
  buildMainMenuProps,
  quickAccessMenus,
  onSearchInProject,
  renderTabs,
  isLeftMostPane,
  isRightMostPane,
  displayMenuIcon,
  displayAskAi,
  onAskAiClicked,
}: TabsTitlebarProps): React.MixedElement {
  void displayAskAi;
  void onAskAiClicked;

  const gdevelopTheme = React.useContext(GDevelopThemeContext);
  const isTouchscreen = useScreenType() === 'touch';
  const [projectSearch, setProjectSearch] = React.useState('');
  const { fileMenu, editMenu, helpMenu } = React.useMemo(
    () => {
      const allMenus = adaptFromDeclarativeTemplate(
        buildMainMenuDeclarativeTemplate({
          ...buildMainMenuProps,
          isApplicationTopLevelMenu: true,
        }),
        mainMenuCallbacks
      );

      const file = allMenus.find(m => m.label === 'File' || m.label === 'ملف') || allMenus[isMacLike() ? 1 : 0];
      const edit = allMenus.find(m => m.label === 'Edit' || m.label === 'تعديل') || allMenus[isMacLike() ? 2 : 1];
      const help = allMenus.find(m => m.label === 'Help' || m.label === 'مساعدة') || allMenus[allMenus.length - 1];

      return { fileMenu: file, editMenu: edit, helpMenu: help };
    },
    [buildMainMenuProps, mainMenuCallbacks]
  );

  const carrotsEngineMenu = React.useMemo(() => {
    return {
      label: 'Carrots Engine',
      submenu: [
        {
          label: t`About Carrots Engine`,
          click: () => mainMenuCallbacks.onOpenAbout(true),
        },
        { type: 'separator' },
        {
          label: t`My Profile`,
          click: () => mainMenuCallbacks.onOpenProfile(true),
        },
        {
          label: t`Preferences`,
          click: () => mainMenuCallbacks.onOpenPreferences(true),
        },
        {
          label: t`Language`,
          click: () => mainMenuCallbacks.onOpenLanguage(true),
        },
        ...(!!electron
          ? [
              { type: 'separator' },
              {
                label: t`Quit`,
                click: () => mainMenuCallbacks.onCloseApp(),
              },
            ]
          : []),
      ],
    };
  }, [mainMenuCallbacks]);

  const currentProjectName =
    buildMainMenuProps.project && buildMainMenuProps.project.getName
      ? buildMainMenuProps.project.getName()
      : '';
  const [tooltipData, setTooltipData] = React.useState<?{|
    element: HTMLElement,
    editorTab: EditorTab,
  |}>(null);
  const tooltipTimeoutId = React.useRef<?TimeoutID>(null);

  const onEditorTabHovered = React.useCallback(
    (
      editorTab: ?EditorTab,
      { isLabelTruncated }: {| isLabelTruncated: boolean |}
    ) => {
      if (isTouchscreen) {
        setTooltipData(null);
        return;
      }

      if (tooltipTimeoutId.current) {
        clearTimeout(tooltipTimeoutId.current);
        tooltipTimeoutId.current = null;
      }

      if (editorTab && isLabelTruncated) {
        const element = document.getElementById(getTabId(editorTab));
        if (element) {
          tooltipTimeoutId.current = setTimeout(
            () => {
              setTooltipData({ editorTab, element });
            },
            // If the tooltip is already displayed, quickly change to the new tab
            // but not too quick because the display might look flickering.
            tooltipData ? 100 : 500
          );
        }
      } else {
        tooltipTimeoutId.current = setTimeout(() => {
          setTooltipData(null);
        }, 50);
      }
    },
    [isTouchscreen, tooltipData]
  );

  const onEditorTabClosing = React.useCallback(() => {
    // Always clear the tooltip when a tab is closed,
    // as they are multiple actions that can be done to
    // close it, it's safer (close all, close others, close one).
    if (tooltipTimeoutId.current) {
      clearTimeout(tooltipTimeoutId.current);
      tooltipTimeoutId.current = null;
    }
    setTooltipData(null);
  }, []);

  React.useEffect(
    () => {
      return () => {
        if (tooltipTimeoutId.current) {
          clearTimeout(tooltipTimeoutId.current);
        }
      };
    },
    // Clear timeout if necessary when unmounting.
    []
  );

  const handleDoubleClick = React.useCallback(() => {
    // On macOS, double-clicking the title bar should maximize/restore the window
    if (isMacLike()) {
      Window.toggleMaximize();
    }
  }, []);

  const triggerSearchInProject = React.useCallback(
    () => {
      onSearchInProject(projectSearch);
    },
    [onSearchInProject, projectSearch]
  );

  // Compute the "Carrots Engine" brand menu from the File menu
  // (Redefined using our custom carrotsEngineMenu and resolved fileMenu/editMenu/helpMenu)

  return (
    <div
      style={{
        ...styles.container,
        // Hiding the titlebar should still keep its position in the layout to avoid layout shifts:
        visibility: hidden ? 'hidden' : 'visible',
        pointerEvents: hidden ? undefined : 'all',
      }}
      className={`${WINDOW_DRAGGABLE_PART_CLASS_NAME} carrots-tabs-titlebar`}
      onDoubleClick={handleDoubleClick}
    >
      {isLeftMostPane && <TitleBarLeftSafeMargins />}
      {displayMenuIcon && (
        <span
          className={WINDOW_NON_DRAGGABLE_PART_CLASS_NAME}
          style={styles.menuItemsRow}
        >
          {/* ── Carrots Engine brand button ── */}
          <ElementWithMenu
            key="carrots-engine-menu"
            element={
              <MenuBarButton
                label="Carrots Engine"
                icon={<CarrotLogo />}
                isBrandItem
                onClick={() => {}}
              />
            }
            // $FlowFixMe[prop-missing]
            buildMenuTemplate={() => carrotsEngineMenu.submenu || []}
          />

          <MenuSeparator />

          {/* ── File menu ── */}
          {fileMenu && (
            <ElementWithMenu
              key="file-menu"
              element={
                <MenuBarButton
                  // $FlowFixMe[prop-missing]
                  label={fileMenu.label || 'File'}
                  onClick={() => {}}
                />
              }
              // $FlowFixMe[prop-missing]
              buildMenuTemplate={() => fileMenu.submenu || []}
            />
          )}

          <MenuSeparator />

          {/* ── Edit menu ── */}
          {editMenu && (
            <ElementWithMenu
              key="edit-menu"
              element={
                <MenuBarButton
                  // $FlowFixMe[prop-missing]
                  label={editMenu.label || 'Edit'}
                  onClick={() => {}}
                />
              }
              // $FlowFixMe[prop-missing]
              buildMenuTemplate={() => editMenu.submenu || []}
            />
          )}

          <MenuSeparator />

          {/* ── Quick Access menus (Game Objects, Tools, Scenes, etc.) ── */}
          {quickAccessMenus.map((menu, index) => (
            <React.Fragment key={`quick-menu-${menu.label}-${index}`}>
              <ElementWithMenu
                element={
                  <MenuBarButton
                    label={menu.label}
                    onClick={() => {}}
                  />
                }
                buildMenuTemplate={() => menu.submenu}
              />
              <MenuSeparator />
            </React.Fragment>
          ))}

          {/* ── Help menu ── */}
          {helpMenu && (
            <ElementWithMenu
              key="help-menu"
              element={
                <MenuBarButton
                  // $FlowFixMe[prop-missing]
                  label={helpMenu.label || 'Help'}
                  onClick={() => {}}
                />
              }
              // $FlowFixMe[prop-missing]
              buildMenuTemplate={() => helpMenu.submenu || []}
            />
          )}


          {/* ── Search bar ── */}
          <span style={styles.searchContainer}>
            <CompactSearchBar
              value={projectSearch}
              onChange={setProjectSearch}
              onRequestSearch={triggerSearchInProject}
              placeholder={t`Search in project`}
            />
          </span>

          {/* ── Project name pill ── */}
          {currentProjectName ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#e8914a',
                background: 'rgba(232, 145, 74, 0.10)',
                border: '1px solid rgba(232, 145, 74, 0.22)',
                borderRadius: 5,
                padding: '2px 10px',
                marginLeft: 4,
                maxWidth: 140,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                letterSpacing: '0.01em',
              }}
              title={currentProjectName}
            >
              {currentProjectName}
            </span>
          ) : null}
        </span>
      )}
      {renderTabs(onEditorTabHovered, onEditorTabClosing)}
      {isRightMostPane && <TitleBarRightSafeMargins />}
      {tooltipData && (
        <TabsTitlebarTooltip
          anchorElement={tooltipData.element}
          editorTab={tooltipData.editorTab}
        />
      )}
    </div>
  );
}
