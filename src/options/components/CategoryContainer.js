import React from "react";
import browser from "webextension-polyfill";
import OptionContainer from "./OptionContainer";
import "../styles/categoryContainer.scss";

export default props => {
  const { category, elements } = props;
  return (
    <li className="categoryContainer">
      <p className="categoryTitle">{browser.i18n.getMessage(category)}</p>
      <ul className="categoryElements">
        {elements.map((option, index) => (
          <div key={index}>
            <OptionContainer {...option}>
              {option.hasOwnProperty("childElements") ? (
                <ul className="childElements">
                  {option.childElements.map((option, index) => (
                    <OptionContainer {...option} key={index} />
                  ))}
                </ul>
              ) : (
                ""
              )}
            </OptionContainer>
            <hr />
          </div>
        ))}
      </ul>
    </li>
  );
};
