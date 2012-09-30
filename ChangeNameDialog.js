/*global console, Ext */
Ext.define('ChangeNameDialog', {
    extend: 'Rally.ui.dialog.Dialog',
    alias: 'widget.pxschangename',
    changeset: null,
    width: 300,
    padding: '5px',
    items: [{
        xtype: 'panel',
        layout: { type: 'vbox' },
        itemId: 'settings_dialog',
        height: 70,
        items: [{
            xtype: 'container',
            itemId: 'settings',
            items: [
            {
                xtype: 'container',
                itemId: 'settings_message',
                padding: 5
            }]
        }]
    }],
    constructor: function( cfg ) {
        this.callParent(arguments);
        this.initConfig(cfg);
    },
    initComponent: function() {
        this.callParent(arguments);
        this.addEvents(
                /**
                 * @event settingsChosen
                 * Fires when user clicks OK after modifying settings
                 * @param {Hash} checkbox_settings
                 */
                'settingsChosen'
        );
        this._placeTextBox();
        this._placeButtons();
    },
    _placeTextBox: function() {
        var message = "No Message";
        if ( this.changeset && this.changeset.Message ) {
            message = this.changeset.Message;
        }
        this.message_box = Ext.create( 'Rally.ui.TextField', {
            fieldLabel: "Message: ",
            value: message
        } );
        // changeset_dates
        this.down('#settings_message').add(this.message_box);
    },
    _placeButtons: function() {
        this.down('#settings_dialog').addDocked({
            xtype: 'toolbar',
            dock: 'bottom',
            padding: '0 0 10 0',
            layout: {
                pack: 'center'
            },
            ui: 'footer',
            items: [
                {
                    xtype: 'rallybutton',
                    text: "OK",
                    scope: this,
                    userAction: 'clicked done in dialog',
                    handler: function() {
                        var new_message = this.message_box.getValue();
                        
                        this.fireEvent('settingsChosen', {
                            changeset: this.changeset,
                            message: new_message
                        });
                        this.close();
                    }
                },
                {
                    xtype: 'component',
                    itemId: 'cancelLink',
                    renderTpl: '<a href="#" class="dialog-cancel-link">Cancel</a>',
                    renderSelectors: {
                        cancelLink: 'a'
                    },
                    listeners: {
                        click: {
                            element: 'cancelLink',
                            fn: function(){
                                this.close();
                            },
                            stopEvent: true
                        },
                        scope: this
                    }
                }
            ]
        });
    }
});
