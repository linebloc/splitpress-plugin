/* SplitPress variant editor — Gutenberg plugin for A/B variant posts.
 * Config is injected via wp_localize_script as window.splitpressVariantCfg. */
(function (cfg) {
    var el       = wp.element.createElement;
    var useState = wp.element.useState;
    var Modal    = wp.components.Modal;
    var Button   = wp.components.Button;
    var PluginPostPublishPanel =
        (wp.editor   && wp.editor.PluginPostPublishPanel) ||
        (wp.editPost && wp.editPost.PluginPostPublishPanel);

    // ── Blocking modal shown on editor load ──────────────────────────────────
    function SplitPressVariantModal() {
        var s = useState(true), open = s[0], setOpen = s[1];
        if (!open) return null;
        return el(
            Modal,
            { title: "You're editing a variant", isDismissible: false, style: { maxWidth: 480 } },
            el('p', { style: { color: '#374151', lineHeight: '1.6', marginBottom: '20px' } },
                'This post is Variant A in a SplitPress A/B test. ' +
                'Edit the content here and save when done — your changes will be compared against the original.'
            ),
            el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } },
                el(Button, { variant: 'secondary', href: cfg.backUrl }, '← Back to test'),
                el(Button, { variant: 'primary', onClick: function () { setOpen(false); } }, 'Start editing')
            )
        );
    }
    wp.plugins.registerPlugin('splitpress-variant-modal', { render: SplitPressVariantModal });

    // ── Post-publish panel: replace "View Post" / "Add Post" buttons ─────────
    if (PluginPostPublishPanel) {
        function SplitPressPublishPanel() {
            return el(
                PluginPostPublishPanel,
                { title: "What's next?", initialOpen: true },
                el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' } },
                    el(Button, { variant: 'primary', href: cfg.backUrl, style: { justifyContent: 'center' } },
                        'See test →'),
                    el(Button, { variant: 'secondary', href: cfg.dashboardUrl, style: { justifyContent: 'center' } },
                        'SplitPress Dashboard')
                )
            );
        }
        wp.plugins.registerPlugin('splitpress-publish-panel', { render: SplitPressPublishPanel });

        // Hide the default "POST ADDRESS" field and "View Post" / "Add Post" buttons.
        var style = document.createElement('style');
        style.textContent =
            '.editor-post-publish-panel__postpublish-subheader,' +
            '.editor-post-publish-panel__postpublish-buttons,' +
            '.post-publish-panel__postpublish-post-address' +
            '{ display: none !important; }';
        document.head.appendChild(style);
    }
}(window.splitpressVariantCfg || {}));
