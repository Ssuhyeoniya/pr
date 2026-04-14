import { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * 글로벌 모달 컨텍스트
 * openModal({ title, body, footer, wide }) 로 모달을 띄우고
 * closeModal() 으로 닫음. 페이지 전환 시 자동으로 닫힘.
 */
const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null);

  const openModal = useCallback((config) => {
    setModal(config);
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
  }, []);

  // ESC 키로 닫기
  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setModal(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal]);

  return (
    <ModalContext.Provider value={{ modal, openModal, closeModal }}>
      {children}
      {modal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}>
          <div className={`modal ${modal.wide ? 'modal-wide' : ''}`}>
            <div className="modal-header">
              <h3>{modal.title}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">{modal.body}</div>
            {modal.footer && <div className="modal-footer">{modal.footer}</div>}
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}
