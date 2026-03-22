import React from 'react';
import PropTypes from 'prop-types';
import './BaseModal.css';

function BaseModal({
  onClose,
  title,
  children,
  panelClassName = '',
  bodyClassName = '',
  overlayClassName = '',
  headerClassName = '',
  size = 'md',
  footer = null,
  showCloseButton = true,
}) {
  const panelClasses = ['app-modal__panel', `app-modal__panel--${size}`, panelClassName]
    .filter(Boolean)
    .join(' ');
  const overlayClasses = ['app-modal', overlayClassName].filter(Boolean).join(' ');
  const bodyClasses = ['app-modal__body', bodyClassName].filter(Boolean).join(' ');
  const headerClasses = ['app-modal__header', headerClassName].filter(Boolean).join(' ');

  return (
    <div className={overlayClasses} onClick={onClose} role="presentation">
      <div
        className={panelClasses}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Modal'}
      >
        {(title || showCloseButton) && (
          <div className={headerClasses}>
            {title ? <h2 className="app-modal__title">{title}</h2> : <div />}
            {showCloseButton && (
              <button type="button" className="app-modal__close" onClick={onClose} aria-label="Закрыть">
                <span className="app-modal__close-icon" aria-hidden="true">
                  <span className="app-modal__close-line app-modal__close-line--first" />
                  <span className="app-modal__close-line app-modal__close-line--second" />
                </span>
              </button>
            )}
          </div>
        )}
        <div className={bodyClasses}>{children}</div>
        {footer ? <div className="app-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}

BaseModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  children: PropTypes.node.isRequired,
  panelClassName: PropTypes.string,
  bodyClassName: PropTypes.string,
  overlayClassName: PropTypes.string,
  headerClassName: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  footer: PropTypes.node,
  showCloseButton: PropTypes.bool,
};

export default BaseModal;
