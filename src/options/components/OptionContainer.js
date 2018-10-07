import React from "react";
import browser from "webextension-polyfill";
import { setSettings, getSettings } from "src/settings/settings";
import "../styles/OptionContainer.scss";

export default props => {
  const { title, captions, type, id, children } = props;

  const handleValueChange = e => {
    let value = e.target.value;

    if (type == "number") {
      const validity = e.target.validity;
      if (validity.rangeOverflow) value = props.max;
      else if (validity.rangeUnderflow) value = props.min;
      else if (validity.badInput || value == "" || !validity.valid) value = props.default;
    }

    setSettings(id, value);
  };

  const handleCheckedChange = e => {
    setSettings(id, e.target.checked);
  };

  let optionForm;
  switch (type) {
    case "checkbox":
      optionForm = (
        <label>
          <input
            type="checkbox"
            id={id}
            onChange={handleCheckedChange}
            defaultChecked={getSettings(id)}
          />
          <span className="checkbox" />
        </label>
      );
      break;
    case "number":
      optionForm = (
        <input
          type="number"
          id={id}
          min={props.min}
          max={props.max}
          step={props.step}
          placeholder={props.placeholder}
          onChange={handleValueChange}
          defaultValue={getSettings(id)}
        />
      );
      break;
    case "text":
      optionForm = (
        <input
          type="text"
          id={id}
          placeholder={props.placeholder}
          onChange={handleValueChange}
          defaultValue={getSettings(id)}
        />
      );
      break;
    case "radio":
      optionForm = (
        <label>
          <input
            type="radio"
            name={id}
            value={props.value}
            onChange={handleValueChange}
            defaultChecked={props.value === getSettings(id) ? "checked" : ""}
          />
          <span className="radio" />
        </label>
      );
      break;
    case "color":
      optionForm = (
        <label>
          <input type="color" id={id} onChange={handleValueChange} defaultValue={getSettings(id)} />
        </label>
      );
      break;
    case "select":
      optionForm = (
        <div className="selectWrap">
          <select id={id} onChange={handleValueChange} defaultValue={getSettings(id)}>
            {props.options.map((option, index) => (
              <option value={option.value} key={index}>
                {browser.i18n.getMessage(option.name)}
              </option>
            ))}
          </select>
        </div>
      );
      break;
    case "button":
      optionForm = (
        <input type="button" value={browser.i18n.getMessage(props.value)} onClick={props.onClick} />
      );
      break;
    case "file":
      optionForm = (
        <label className="button includeSpan" htmlFor={id}>
          <span>{browser.i18n.getMessage(props.value)}</span>
          <input
            type="file"
            id={id}
            hidden={true}
            accept={props.accept}
            multiple={props.multiple}
            onChange={props.onChange}
          />
        </label>
      );
      break;
    case "none":
      optionForm = "";
      break;
  }

  return (
    <li className={`optionContainer ${props.updated ? "updated" : ""} ${props.new ? "new" : ""}`}>
      <div className="optionElement">
        <div className="optionText">
          <p>{title ? (props.useRawTitle ? title : browser.i18n.getMessage(title)) : ""}</p>
          {captions.map((caption, index) => (
            <p className="caption" key={index}>
              {caption
                ? props.useRawCaptions
                  ? caption
                  : browser.i18n.getMessage(caption).replace(/<br>/g, "\n")
                : ""}
            </p>
          ))}
          {props.extraCaption ? props.extraCaption : ""}
        </div>
        <div className="optionForm">{optionForm}</div>
      </div>
      {children}
    </li>
  );
};
