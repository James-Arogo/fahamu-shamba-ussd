(function () {
    if (window.__fahamuChatbotWidgetInitialized) {
        return;
    }
    window.__fahamuChatbotWidgetInitialized = true;

    var CHATBOT_URL = 'https://shamba-assistant.onrender.com/';

    function injectStylesheet() {
        if (document.querySelector('link[data-chatbot-widget-style="true"]')) {
            return;
        }

        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/css/chatbot-widget.css';
        link.setAttribute('data-chatbot-widget-style', 'true');
        document.head.appendChild(link);
    }

    function createWidget() {
        if (document.querySelector('.chatbot-widget')) {
            return;
        }

        var wrapper = document.createElement('div');
        wrapper.className = 'chatbot-widget';
        wrapper.innerHTML = [
            '<div class="chatbot-backdrop" data-chatbot-close="true"></div>',
            '<section class="chatbot-panel" aria-label="Shamba Assistant" aria-hidden="true">',
            '  <div class="chatbot-panel-header">',
            '    <div class="chatbot-panel-brand">',
            '      <img src="/images/chatbot-icon.svg" alt="Shamba Assistant icon">',
            '      <div>',
            '        <strong>Shamba Assistant</strong>',
            '        <span>Ask farming questions and get instant support</span>',
            '      </div>',
            '    </div>',
            '    <div class="chatbot-panel-actions">',
            '      <a class="chatbot-open-tab" href="' + CHATBOT_URL + '" target="_blank" rel="noopener noreferrer">Open Full Chat</a>',
            '      <button type="button" class="chatbot-close" aria-label="Close chatbot">&times;</button>',
            '    </div>',
            '  </div>',
            '  <div class="chatbot-panel-body">',
            '    <iframe class="chatbot-iframe" src="' + CHATBOT_URL + '" title="Shamba Assistant chatbot" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="clipboard-read; clipboard-write"></iframe>',
            '    <div class="chatbot-fallback">If the embedded assistant does not load here, <a href="' + CHATBOT_URL + '" target="_blank" rel="noopener noreferrer">open the chatbot in a new tab</a>.</div>',
            '  </div>',
            '</section>',
            '<button type="button" class="chatbot-launcher" aria-label="Open Shamba Assistant" aria-expanded="false">',
            '  <span class="chatbot-launcher-icon-wrap"><img class="chatbot-launcher-icon" src="/images/chatbot-icon.svg" alt="" aria-hidden="true"></span>',
            '  <span class="chatbot-launcher-text">',
            '    <span class="chatbot-launcher-title">Chat With Shamba Assistant</span>',
            '    <span class="chatbot-launcher-subtitle">Powered by your hosted chatbot</span>',
            '  </span>',
            '</button>'
        ].join('');

        document.body.appendChild(wrapper);

        var launcher = wrapper.querySelector('.chatbot-launcher');
        var panel = wrapper.querySelector('.chatbot-panel');
        var closeButton = wrapper.querySelector('.chatbot-close');
        var backdrop = wrapper.querySelector('.chatbot-backdrop');

        function openWidget() {
            wrapper.classList.add('is-open');
            panel.setAttribute('aria-hidden', 'false');
            launcher.setAttribute('aria-expanded', 'true');
        }

        function closeWidget() {
            wrapper.classList.remove('is-open');
            panel.setAttribute('aria-hidden', 'true');
            launcher.setAttribute('aria-expanded', 'false');
        }

        launcher.addEventListener('click', function () {
            if (wrapper.classList.contains('is-open')) {
                closeWidget();
            } else {
                openWidget();
            }
        });

        closeButton.addEventListener('click', closeWidget);
        backdrop.addEventListener('click', closeWidget);

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && wrapper.classList.contains('is-open')) {
                closeWidget();
            }
        });
    }

    function init() {
        injectStylesheet();
        createWidget();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
