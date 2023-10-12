import Quill from "quill";

export class Counter {
    quill: Quill;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    container: any;
    constructor(quill: Quill, options: { container: string; }) {
        this.quill = quill;
        this.options = options;
        this.container = document.querySelector(options.container);
        quill.on('text-change', this.update.bind(this));
        this.update();  // Account for initial contents
    }

    calculate() {
        let text = this.quill.getText();
        if (this.options.unit === 'word') {
            text = text.trim();
            // Splitting empty text returns a non-empty array
            return text.length > 0 ? text.split(/\s+/).length : 0;
        } else {
            return text.length;
        }
    }

    update() {
        const length = this.calculate();
        let label = this.options.unit;
        if (length !== 1) {
            label += 's';
        }
        this.container.innerText = length + ' ' + label;
    }
}

const BaseBlock = Quill.import('blots/block/embed');

class TwitterBlot extends BaseBlock {

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    static create(data) {
        const node = super.create(data);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        function buildInnerHtml(data) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            window.twitter = function () {
                const loadScript = function (url: string) {
                    return new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = url;

                        script.onload = function () {
                            resolve(true);
                        };

                        script.onerror = function () {
                            reject();
                        };

                        document.head.appendChild(script);
                    });
                };
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                if (!window.twttr) {
                    loadScript('//platform.twitter.com/widgets.js').then(() => {
                        setTimeout(() => {
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            window.twttr.widgets.load();
                        }, 100);
                    });
                } else {
                    setTimeout(() => {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    window.twttr.widgets.load();
                }, 100);
                }
            };
            
            return `
            <div contenteditable="false" style="display: flex; max-width: 100%;">
            <blockquote class="twitter-tweet"><a tabindex="-1" href="${data.url}"></a> </blockquote>
            <img src="*" onerror="event.stopPropagation(); event.preventDefault(); window.twitter();" style="display: none;"/>
            </div>
            `;
        }

        const innerHTML = buildInnerHtml(data);
        node.innerHTML = innerHTML;
        // node.setAttribute('contenteditable', false);
        // store data
        node.setAttribute('data-url', data.url);
        return node;
    }
    
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    static value(domNode) {
        const { url } = domNode.dataset;
        return { url };
    }

    index() {
        return 1;
    }

}

TwitterBlot.blotName = 'twitter';
TwitterBlot.className = 'ql-twitter';
TwitterBlot.tagName = 'div';

// Quill.register({
//     'formats/twitter': TwitterBlot
// });