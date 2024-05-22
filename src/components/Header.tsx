import React from "react";

function Header({ type = "title", title, subtext, user }: HeaderProps) {
  return (
    <div className="header">
      <h1 className="header-title">
        {title}
        {type === "greeting" && <span>&nbsp;{user}</span>}
      </h1>
      <p className="header-subtext">{subtext}</p>
    </div>
  );
}

export default Header;
