module.exports = {
    darkMode: 'class',
    content: ['./index.html', './script.js'],
    theme: {
        extend: {
            colors: {
                brand: {
                    orange: 'var(--brand-orange)',
                    orangeHover: 'var(--brand-orange-hover)',
                    darkBg: 'var(--bg-main)',
                    cardBg: 'var(--bg-card)',
                    cardHover: 'var(--bg-card-hover)',
                    border: 'var(--border-color)',
                    textMain: 'var(--text-main)',
                    textMuted: 'var(--text-muted)'
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace']
            }
        }
    }
};
