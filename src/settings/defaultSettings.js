import browserInfo from "browser-info";

export default [
  {
    category: "generalLabel",
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
        id: "ifSavePrivateWindow",
        title: "ifSavePrivateWindowLabel",
        captions: ["ifSavePrivateWindowCaptionLabel"],
        type: "checkbox",
        default: false
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
      },
      {
        id: "dateFormat",
        title: "dateFormatLabel",
        captions: ["dateFormatCaptionLabel"],
        type: "text",
        placeholder: "YYYY.MM.DD HH:mm:ss",
        default: "YYYY.MM.DD HH:mm:ss"
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
            min: 0.1,
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
    category: "startUpLabel",
    elements: [
      {
        id: "ifOpenLastSessionWhenStartUp",
        title: "ifOpenLastSessionWhenStartUpLabel",
        captions: ["ifOpenLastSessionWhenStartUpCaptionLabel"],
        type: "checkbox",
        default: false
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
        id: "isShowSearchBar",
        title: "isShowSearchBarLabel",
        captions: ["isShowSearchBarCaptionLabel"],
        type: "checkbox",
        default: true
      },
      {
        id: "truncateTitle",
        title: "truncateTitleLabel",
        captions: ["truncateTitleCaptionLabel"],
        type: "checkbox",
        default: true
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
            min: 600,
            max: 800,
            placeholder: 800,
            default: 800
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
          }
        ]
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
