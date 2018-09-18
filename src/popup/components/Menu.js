import React, { Component } from "react";
import ReactDOM from "react-dom";
import { getSettings } from "src/settings/settings";
import { CSSTransition } from "react-transition-group";
import "../styles/Menu.scss";
import "../styles/fade.scss";

export default class Menu extends Component {
  constructor(props) {
    super(props);
    this.state = {
      position: { x: 0, y: 0 }
    };
  }

  calcPosition = () => {
    const menu = ReactDOM.findDOMNode(this.refs.menu);
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const { x, y } = this.props.menu;
    const popupWidth = parseInt(getSettings("popupWidth"));
    const popupHeight = parseInt(getSettings("popupHeight"));

    let position = { x: x, y: y };
    const isRightOver = position.x + menuWidth > popupWidth;
    const isDownOver = position.y + menuHeight > popupHeight;
    if (isRightOver) position.x = x - menuWidth;
    if (isDownOver) position.y = y - menuHeight;

    if (position.x < 0) position.x = 0;
    if (position.y < 0) position.y = 0;

    return position;
  };

  componentDidUpdate() {
    if (this.shouldUpdate && this.props.menu.isOpen) {
      const position = this.calcPosition();
      this.setState({
        position: position
      });
      this.shouldUpdate = false;
    } else if (!this.props.menu.isOpen) {
      this.shouldUpdate = true;
    }
  }

  render() {
    const { menu } = this.props;
    return (
      <CSSTransition in={menu.isOpen} classNames="fade" timeout={150}>
        <div
          id="menu"
          ref="menu"
          style={{ left: this.state.position.x, top: this.state.position.y }}
        >
          {menu.items}
        </div>
      </CSSTransition>
    );
  }
}
