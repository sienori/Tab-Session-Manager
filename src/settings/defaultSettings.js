export default [
  {
    category: "generalLabel",
    elements: [
      {
        id: "ifOpenNewWindow",
        title: "ifOpenNewWindowLabel",
        captions: ["ifOpenNewWindowCaptionLabel"],
        type: "checkbox",
        default: true
      },
      {
        id: "ifLazyLoading",
        title: "ifLazyLoadingLabel",
        captions: ["ifLazyLoadingCaptionLabel"],
        type: "checkbox",
        default: true
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
    category: "styleLabel",
    elements: [
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
        title: "toolBarPopupLabel",
        captions: ["toolBarPopupCaptionLabel"],
        type: "none",
        childElements: [
          {
            id: "popupWidth",
            title: "widthLabel",
            captions: [""],
            type: "number",
            min: 200,
            max: 800,
            placeholder: 350,
            default: 350
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
  }
];
