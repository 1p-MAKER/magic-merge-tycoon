import React from 'react';
import styles from './SettingsModal.module.css';

// Hardcoded version to avoid TS build issues with importing outside src for now
const APP_VERSION = "0.1.0";

interface SettingsModalProps {
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Settings</h2>
                    <button className={styles.closeButton} onClick={onClose}>&times;</button>
                </div>

                <div className={styles.content}>
                    <div className={styles.description}>
                        同じ絵柄をなぞってマージ（合成）しよう！<br />
                        マナを貯めて召喚＆アップグレード。<br />
                        放置でもマナが貯まるよ！
                    </div>

                    <button className={`${styles.buttonLink} ${styles.disabled}`}>
                        説明書 (準備中)
                    </button>

                    <button className={`${styles.buttonLink} ${styles.disabled}`}>
                        プライバシーポリシー / 利用規約 / お問い合わせ (準備中)
                    </button>

                    <a
                        href="https://scented-zinc-a47.notion.site/2d2768aba03f8041bb12dc5e71a7ceb8"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.buttonLink}
                    >
                        その他のアプリ
                    </a>
                </div>

                <div className={styles.footer}>
                    <div>Version {APP_VERSION}</div>
                    <div className={styles.devCat}>Developed by Dev cat</div>
                </div>
            </div>
        </div>
    );
};
