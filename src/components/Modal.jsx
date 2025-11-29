import React from "react";

export default function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}