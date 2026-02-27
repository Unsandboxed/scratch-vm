const uid = require('../util/uid');

const E = {};
E.frameSource = require('./tw-load-script-as-plain-text!./tw-iframe-extension-worker-entry');

E.none = "'none'";
E.featurePolicy = {
    'accelerometer': E.none,
    'ambient-light-sensor': E.none,
    'battery': E.none,
    'camera': E.none,
    'display-capture': E.none,
    'document-domain': E.none,
    'encrypted-media': E.none,
    'fullscreen': E.none,
    'geolocation': E.none,
    'gyroscope': E.none,
    'magnetometer': E.none,
    'microphone': E.none,
    'midi': E.none,
    'payment': E.none,
    'picture-in-picture': E.none,
    'publickey-credentials-get': E.none,
    'speaker-selection': E.none,
    'usb': E.none,
    'vibrate': E.none,
    'vr': E.none,
    'screen-wake-lock': E.none,
    'web-share': E.none,
    'interest-cohort': E.none
};

E.generateAllow = () => Object.entries(E.featurePolicy)
    .map(([name, permission]) => `${name} ${permission}`)
    .join('; ');

class IframeExtensionWorker {
    static exports = E;

    constructor () {
        this.id = uid();
        this.isRemote = true;
        this.ready = false;
        this.queuedMessages = [];

        this.iframe = document.createElement('iframe');
        this.iframe.className = 'tw-custom-extension-frame';
        this.iframe.dataset.id = this.id;
        this.iframe.style.display = 'none';
        this.iframe.setAttribute('aria-hidden', 'true');
        this.iframe.sandbox = 'allow-scripts';
        this.iframe.allow = E.generateAllow();
        document.body.appendChild(this.iframe);

        window.addEventListener('message', this._onWindowMessage.bind(this));
        const blob = new Blob([
            // eslint-disable-next-line max-len
            `<!DOCTYPE html><body><script>window.__WRAPPED_IFRAME_ID__=${JSON.stringify(this.id)};${E.frameSource}</script></body>`
        ], {
            type: 'text/html; charset=utf-8'
        });
        this.iframe.src = URL.createObjectURL(blob);
    }

    _onWindowMessage (e) {
        if (!e.data || e.data.vmIframeId !== this.id) {
            return;
        }
        if (e.data.ready) {
            this.ready = true;
            for (const {data, transfer} of this.queuedMessages) {
                this.postMessage(data, transfer);
            }
            this.queuedMessages.length = 0;
        }
        if (e.data.message) {
            this.onmessage({
                data: e.data.message
            });
        }
    }

    onmessage () {
        // Should be overridden
    }

    postMessage (data, transfer) {
        if (this.ready) {
            if (transfer) {
                this.iframe.contentWindow.postMessage(data, '*', transfer);
            } else {
                this.iframe.contentWindow.postMessage(data, '*');
            }
        } else {
            this.queuedMessages.push({data, transfer});
        }
    }
}

module.exports = IframeExtensionWorker;
