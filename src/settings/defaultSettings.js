import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import SignInButton from "../options/components/SignInButton";
import CompressAllSessionsForm from "../options/components/CompressAllSessionsForm";

const handleApplyDeviceNameButtonClick = () => {
  const res = confirm(browser.i18n.getMessage("applyDeviceNameConfirmLabel"));
  if (res) browser.runtime.sendMessage({ message: "applyDeviceName" });
};

export default [
  {
    category: "open",
    elements: [
      {
        id: "ifLazyLoading",
        title: "ifLazyLoadingLabel",
        captions: ["ifLazyLoadingCaptionLabel"],
        type: "checkbox",
        default: true,
        childElements: [
          {
            id: "isUseDiscarded",
            title: "isUseDiscardedLabel",
            captions: ["isUseDiscardedCaptionLabel", "isUseDiscardedCaption2Label"],
            type: "checkbox",
            default: true,
            shouldShow: browserInfo().name == "Firefox" && browserInfo().version >= 63
          }
        ]
      },
      {
        id: "isRestoreWindowPosition",
        title: "isRestoreWindowPositionLabel",
        captions: ["isRestoreWindowPositionCaptionLabel"],
        type: "checkbox",
        default: true
      },
      {
        id: "ifSupportTst",
        title: "ifSupportTstLabel",
        captions: ["ifSupportTstCaptionLabel"],
        type: "checkbox",
        default: false,
        childElements: [
          {
            id: "tstDelay",
            title: "tstDelayLabel",
            captions: ["tstDelayCaptionLabel"],
            type: "number",
            min: 0,
            placeholder: 150,
            default: 150
          }
        ]
      }
    ]
  },
  {
    category: "saveLabel",
    elements: [
      {
        id: "saveTabGroups",
        title: "saveTabGroupsLabel",
        captions: ["saveTabGroupsCaptionLabel"],
        link: {
          href: "https://chrome.google.com/webstore/detail/aghdiknflpelpkepifoplhodcnfildao/",
          text: "Save Tab Groups for Tab Session Manager"
        },
        type: "checkbox",
        default: false,
        shouldShow: browserInfo().name == "Chrome" && browserInfo().version >= 89,
      },
      {
        id: "ifSavePrivateWindow",
        title: "ifSavePrivateWindowLabel",
        captions: ["ifSavePrivateWindowCaptionLabel"],
        type: "checkbox",
        default: false
      },
      {
        id: "ignoreUrlList",
        title: "ignoreUrlListLabel",
        captions: ["ignoreUrlListCaptionLabel"],
        type: "textarea",
        default: "",
        placeholder: "https://example.com/*\nhttps://example.net/*"
      },
      {
        id: "shouldSaveDeviceName",
        title: "shouldSaveDeviceNameLabel",
        captions: ["shouldSaveDeviceNameCaptionLabel"],
        type: "checkbox",
        default: false,
        childElements: [
          {
            id: "deviceName",
            title: "deviceNameLabel",
            captions: ["deviceNameCaptionLabel"],
            type: "text",
            placeholder: "My laptop",
            default: ""
          },
          {
            title: "applyDeviceNameLabel",
            captions: ["applyDeviceNameCaptionLabel"],
            type: "button",
            value: "applyDeviceNameButtonLabel",
            onClick: handleApplyDeviceNameButtonClick
          }
        ]
      },
      {
        id: "compressFaviconUrl",
        title: "compressFaviconUrlLabel",
        captions: ["compressFaviconUrlCaptionLabel"],
        type: "checkbox",
        default: true,
        childElements: [
          {
            title: "compressAllSessionsLabel",
            captions: ["compressAllSessionsCaptionLabel"],
            type: "extra",
            extraForm: CompressAllSessionsForm
          }
        ]
      }
    ]
  },
  {
    category: "autoSaveLabel",
    elements: [
      {
        id: "ifAutoSave",
        title: "ifAutoSaveLabel",
        captions: ["ifAutoSaveCaptionLabel"],
        type: "checkbox",
        default: true,
        childElements: [
          {
            id: "autoSaveInterval",
            title: "autoSaveIntervalLabel",
            captions: ["autoSaveIntervalCaptionLabel"],
            type: "number",
            min: 0.5,
            step: 0.1,
            placeholder: 15,
            default: 15
          },
          {
            id: "autoSaveLimit",
            title: "autoSaveLimitLabel",
            captions: ["autoSaveLimitCaptionLabel"],
            type: "number",
            min: 1,
            placeholder: 10,
            default: 10
          }
        ]
      },
      {
        id: "ifAutoSaveWhenClose",
        title: "ifAutoSaveWhenCloseLabel",
        captions: ["ifAutoSaveWhenCloseCaptionLabel"],
        type: "checkbox",
        default: true,
        childElements: [
          {
            id: "autoSaveWhenCloseLimit",
            title: "autoSaveWhenCloseLimitLabel",
            captions: ["autoSaveWhenCloseCaptionLabel"],
            type: "number",
            min: 1,
            placeholder: 10,
            default: 10
          }
        ]
      },
      {
        id: "ifAutoSaveWhenExitBrowser",
        title: "ifAutoSaveWhenExitBrowserLabel",
        captions: ["ifAutoSaveWhenExitBrowserCaptionLabel"],
        type: "checkbox",
        default: true,
        childElements: [
          {
            id: "autoSaveWhenExitBrowserLimit",
            title: "autoSaveWhenExitBrowserLimitLabel",
            captions: ["autoSaveWhenExitBrowserCaptionLabel"],
            type: "number",
            min: 1,
            placeholder: 10,
            default: 10
          }
        ]
      },
      {
        id: "useTabTitleforAutoSave",
        title: "useTabTitleforAutoSaveLabel",
        captions: ["useTabTitleforAutoSaveCaptionLabel"],
        type: "checkbox",
        default: true
      }
    ]
  },
  {
    category: "startupLabel",
    elements: [
      {
        id: "startupBehavior",
        title: "startupBehaviorLabel",
        captions: [],
        type: "none",
        default: "none",
        childElements: [
          {
            id: "startupBehavior",
            title: "openPreviousSessionLabel",
            captions: ["openPreviousSessionCaptionLabel"],
            type: "radio",
            value: "previousSession"
          },
          {
            id: "startupBehavior",
            title: "openStartupSessionLabel",
            captions: ["openStartupSessionCaptionLabel"],
            type: "radio",
            value: "startupSession"
          },
          {
            id: "startupBehavior",
            title: "DoNothingLabel",
            captions: [""],
            type: "radio",
            value: "none"
          }
        ]
      }
    ]
  },
  {
    category: "trackingSessionLabel",
    elements: [
      {
        id: "shouldTrackNewWindow",
        title: "shouldTrackNewWindowLabel",
        captions: ["shouldTrackNewWindowCaptionLabel"],
        type: "checkbox",
        default: true,
      }
    ]
  },
  {
    category: "backupLabel",
    elements: [
      {
        id: "ifBackup",
        title: "ifBackupLabel",
        captions: ["ifBackupCaptionLabel"],
        type: "checkbox",
        default: false,
        childElements: [
          {
            id: "individualBackup",
            title: "individualBackupLabel",
            captions: ["individualBackupCaptionLabel"],
            type: "checkbox",
            default: true,
          },
          {
            id: "backupFolder",
            title: "backupFolderLabel",
            captions: ["backupFolderCaptionLabel"],
            type: "text",
            placeholder: "TabSessionManager - Backup",
            default: "TabSessionManager - Backup"
          }
        ]
      }
    ]
  },
  {
    category: "cloudSyncLabel",
    elements: [
      {
        id: "enabledCloudSync",
        title: "enabledCloudSyncLabel",
        captions: ["enabledCloudSyncCaptionLabel"],
        type: "extra",
        extraForm: SignInButton,
        childElements: [
          {
            id: "enabledAutoSync",
            title: "enabledAutoSyncLabel",
            captions: ["enabledAutoSyncCaptionLabel"],
            type: "checkbox",
            default: false
          },
          {
            id: "includesAutoSaveToSync",
            title: "includesAutoSaveToSyncLabel",
            captions: ["includesAutoSaveToSyncCaptionLabel"],
            type: "checkbox",
            default: true
          }
        ]
      }
    ]
  },
  {
    category: "popupLabel",
    elements: [
      {
        id: "openButtonBehavior",
        title: "openButtonBehaviorLabel",
        captions: ["openButtonBehaviorCaptionLabel"],
        type: "none",
        default: "openInNewWindow",
        childElements: [
          {
            id: "openButtonBehavior",
            title: "openInNewWindowLabel",
            captions: ["openInNewWindowCaptionLabel"],
            type: "radio",
            value: "openInNewWindow"
          },
          {
            id: "openButtonBehavior",
            title: "openInCurrentWindowLabel",
            captions: ["openInCurrentWindowCaptionLabel"],
            type: "radio",
            value: "openInCurrentWindow"
          },
          {
            id: "openButtonBehavior",
            title: "addToCurrentWindowLabel",
            captions: ["addToCurrentWindowCaptionLabel"],
            type: "radio",
            value: "addToCurrentWindow"
          }
        ]
      },
      {
        id: "saveButtonBehavior",
        title: "saveButtonBehaviorLabel",
        captions: ["saveButtonBehaviorCaptionLabel"],
        type: "none",
        default: "saveAllWindows",
        childElements: [
          {
            id: "saveButtonBehavior",
            title: "saveAllWindowsLabel",
            captions: [""],
            type: "radio",
            value: "saveAllWindows"
          },
          {
            id: "saveButtonBehavior",
            title: "saveOnlyCurrentWindowLabel",
            captions: [""],
            type: "radio",
            value: "saveOnlyCurrentWindow"
          }
        ]
      },
      {
        id: "isSessionListOpenInTab",
        title: "isSessionListOpenInTabLabel",
        captions: ["isSessionListOpenInTabCaptionLabel"],
        type: "checkbox",
        default: false
      }
    ]
  },
  {
    category: "styleLabel",
    elements: [
      {
        id: "theme",
        title: "themeLabel",
        captions: ["themeCaptionLabel"],
        type: "select",
        default: "light",
        options: [
          {
            name: "lightLabel",
            value: "light"
          },
          {
            name: "darkLabel",
            value: "dark"
          }
        ]
      },
      {
        title: "sizeLabel",
        captions: ["popupSizeCaptionLabel"],
        type: "none",
        childElements: [
          {
            id: "popupWidthV2",
            title: "widthLabel",
            captions: [""],
            type: "number",
            min: 300,
            max: 800,
            placeholder: 700,
            default: 700
          },
          {
            id: "popupHeight",
            title: "heightLabel",
            captions: [""],
            type: "number",
            min: 200,
            max: 600,
            placeholder: 500,
            default: 500
          },
          {
            id: "sidebarWidth",
            title: "sidebarWidthLabel",
            captions: [""],
            type: "number",
            min: 100,
            max: 800,
            placeholder: 300,
            default: 300
          }
        ]
      },
      {
        id: "dateFormat",
        title: "dateFormatLabel",
        captions: ["dateFormatCaptionLabel"],
        type: "text",
        placeholder: "YYYY.MM.DD HH:mm:ss",
        default: "YYYY.MM.DD HH:mm:ss"
      },
      {
        id: "truncateTitle",
        title: "truncateTitleLabel",
        captions: ["truncateTitleCaptionLabel"],
        type: "checkbox",
        default: true
      },
      {
        id: "isShowOpenButtons",
        title: "isShowOpenButtonsLabel",
        captions: ["isShowOpenButtonsCaptionLabel"],
        type: "checkbox",
        default: true
      },
      {
        id: "thumbnailImageSource",
        title: "thumbnailImageSourceLabel",
        captions: ["thumbnailImageSourceCaption"],
        type: "select",
        default: "representative",
        options: [
          {
            name: "thumbnailSourceRepresentativeLabel",
            value: "representative"
          },
          {
            name: "thumbnailSourceScreenshotLabel",
            value: "screenshot"
          }
        ]
      },
      {
        id: "thumbnailViewMode",
        title: "tabViewModeLabel",
        captions: ["tabViewModeCaptionLabel"],
        type: "select",
        default: "list",
        shouldShow: false,
        options: [
          {
            name: "listViewLabel",
            value: "list"
          },
          {
            name: "gridViewLabel",
            value: "grid"
          }
        ]
      },
      {
        id: "thumbnailSize",
        title: "thumbnailColumnsLabel",
        captions: [""],
        type: "number",
        min: 1,
        max: 6,
        step: 1,
        default: 3,
        shouldShow: false
      },
      {
        id: "hideThumbnailText",
        title: "hideThumbnailTextLabel",
        captions: ["hideThumbnailTextCaptionLabel"],
        type: "checkbox",
        default: false,
        shouldShow: false
      }
    ]
  },
  {
    category: "otherLabel",
    elements: [
      {
        id: "isShowOptionsPageWhenUpdated",
        title: "isShowOptionsPageWhenUpdatedLabel",
        captions: ["isShowOptionsPageWhenUpdatedCaptionLabel"],
        type: "checkbox",
        default: true
      },
      {
        id: "isDebugMode",
        title: "isDebugModeLabel",
        captions: ["isDebugModeCaptionLabel"],
        type: "checkbox",
        default: false
      }
    ]
  }
];
