/*global console, Ext */
Ext.define('SettingsDialog', {
    extend: 'Rally.ui.dialog.Dialog',
    alias: 'widget.pxssettings',   
    width: 300,
    padding: '5px',
    items: [{
        xtype: 'panel',
        layout: { type: 'vbox' },
        itemId: 'settings_dialog',
        height: 300,
        items: [{
            xtype: 'container',
            itemId: 'changeset_settings',
            height: 100,
            items: [{
                xtype: 'component',
                renderTpl: "<strong>Filter Changesets By:</strong>",
                padding: 5
            },
            {
                xtype: 'container',
                itemId: 'changeset_dates',
                padding: 5
            }]
        },
        {
            xtype: 'container',
            itemId: 'artifact_settings',
            flex: 1,
            height: 300,
            items: [{
                xtype: 'component',
                renderTpl: "<strong>Filter Artifacts By:</strong>",
                padding: 5
            },
            {
                xtype: 'container',
                itemId: 'artifact_checkboxes',
                padding: 5
            },
            {
                xtype: 'container',
                itemId: 'tag_picker',
                padding: 5
            },
            {
                xtype: 'container',
                itemId: 'release_dropdown',
                padding: 5
            },
            {
                xtype: 'container',
                itemId: 'iteration_dropdown',
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
        this._placeTagPicker();
        this._placeCheckboxes();
        this._placeTimeboxes();
        this._placeDateRange();
        this._placeButtons();
    },
    _placeDateRange: function() {
        this.start_date_picker = Ext.create( Rally.ui.DateField,{
            fieldLabel: 'Start Date',
            value: Rally.util.DateTime.add( new Date(), "day", -1 )
        });
        
        this.end_date_picker = Ext.create( Rally.ui.DateField,{
            fieldLabel: 'End Date',
            value: new Date()
        });
        
        // changeset_dates
        this.down('#changeset_dates').add(this.start_date_picker);
        this.down('#changeset_dates').add(this.end_date_picker);
    },
    _placeTagPicker: function() {
        this.tag_picker = Ext.create('Rally.ui.picker.TagPicker', {
            width: 275,
            fieldLabel: "Tags ",
            allowBlank: true,
            toolTipPreferenceKey: undefined /* for bug avoidance */
        });
        this.down('#tag_picker').add( this.tag_picker );
    },
    _placeTimeboxes: function() {
        this.release_combo = Ext.create('Rally.ui.ReleaseComboBox', {
            hideLabel: false,
            fieldLabel: "Release: ",
            width: 275,
            allowBlank: true,
            storeConfig: {
                listeners: {
                    load: function(store) {
                        console.log( "onload" );
                        store.loadData([{formattedName: '--ANY--', 
                                        formattedStartDate: 'n/a', 
                                        formattedEndDate: 'n/a',
                                        Name: '--ANY--',
                                        isSelected: false}], 
                                        true);
                        store.sort('formattedStartDate', 'DESC');
    
                     }
                }
            }
        });
        this.down('#release_dropdown').add( this.release_combo );
        
        this.iteration_combo =  Ext.create('Rally.ui.IterationComboBox', {
            hideLabel: false,
            fieldLabel: "Iteration: ",
            width: 275,
            storeConfig: {
                listeners: {
                    load: function(store) {
                        console.log( "onload" );
                        store.loadData([{formattedName: '--ANY--', 
                                        formattedStartDate: 'n/a', 
                                        formattedEndDate: 'n/a',
                                        Name: '--ANY--',
                                        isSelected: false}], 
                                        true);
                        store.sort('formattedStartDate', 'DESC');
    
                     }
                }
            }
        });
        this.down('#iteration_dropdown').add( this.iteration_combo );
    },
    _placeCheckboxes: function() {
        var that = this;
        this.checkboxHash = {
                'HierarchicalRequirement': Ext.create( 'Ext.form.field.Checkbox', 
                        {boxLabel: 'Stories', name: 'rb', inputValue: 'HierarchicalRequirement ', checked: true } ),
                'Defect': Ext.create( 'Ext.form.field.Checkbox', 
                        {boxLabel: 'Defects', name: 'rb', inputValue: 'Defect ', checked: true } ),
                'Task': Ext.create( 'Ext.form.field.Checkbox', 
                        {boxLabel: 'Tasks', name: 'rb', inputValue: 'Task ', checked: false } )
        };
        this.checkboxgroup = Ext.create('Ext.form.Panel', {
            layout: { type: 'hbox' },
            defaults: {
                checked: true,
                scope: this
            },
            items: [{
                xtype: 'component',
                renderTpl: "<strong>Type: &nbsp;&nbsp;</strong>"
            }]
        });
        Ext.Object.each( this.checkboxHash, function( key, value, myself ) {
            that.checkboxgroup.add( value );
        } );
        this.down('#artifact_checkboxes').add( this.checkboxgroup );
    },
    _getChangesetDates: function() {
        var dates = {
            start: Rally.util.DateTime.toIsoString( this.start_date_picker.getValue(), false),
            end: Rally.util.DateTime.toIsoString(this.end_date_picker.getValue(), false)
        };
        return dates;
    },
    _getArtifactTimeboxes: function() {
        var timeboxes = {
            iteration: this.iteration_combo.getRecord(),
            release: this.release_combo.getRecord()
        };
        return timeboxes;
    },
    _getArtifactTags: function() {
        console.log( "_getArtifactTags" );
        var tags = [];
        if ( this.tag_picker ) {
            tags = this.tag_picker.getValue();
        }
        return tags;
    },
    _getArtifactTypes: function() {
        console.log( "_getArtifactTypes" );
        var cbConfig = {};
        var counter = 0;
        Ext.Object.each( this.checkboxHash, function( key, checkbox, myself ) {
            if ( checkbox.checked ) {
                counter++;
            }
            cbConfig[ key ] = checkbox.checked;            
        } );
        cbConfig.count_checked = counter;
        return cbConfig;
    },
    _getQueryHtml: function() {
        var query_html = "<bold>Changeset</bold>: ";
        // changeset query
        var changeset_dates = this._getChangesetDates();
        if ( changeset_dates.start ) {
            query_html += " Start: " + changeset_dates.start.replace(/T\d\d:\d\d:\d\d\-\d\d:\d\d/,"");            
        }
        if ( changeset_dates.end ) {
            query_html += " End: " + changeset_dates.end.replace(/T\d\d:\d\d:\d\d\-\d\d:\d\d/,"");
        }
        
        query_html += "<br/>";
        // artifact query
        // var checkbox_settings = this._getArtifactTypes();
        var timebox_settings = this._getArtifactTimeboxes();
        query_html += "<bold>Artifact</bold>: ";
        if (timebox_settings.iteration ) {
            query_html += " Iteration: " + timebox_settings.iteration.data.Name;
        }
        if ( timebox_settings.release ) {
            query_html += " Release: " + timebox_settings.release.data.Name;
        }
        var tags = this._getArtifactTags();
        if ( tags.length > 0 ) {
            query_html += " Tags: ";
            Ext.Array.each( tags, function( tag, index, reverse ) {
                query_html += tag.Name + " ";
            } );
        }
        
        return query_html;
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
                        var checkbox_settings = this._getArtifactTypes();
                        var timebox_settings = this._getArtifactTimeboxes();
                        var changeset_dates = this._getChangesetDates();
                        var tags = this._getArtifactTags();
                        
                        var query_html = this._getQueryHtml();

                        this.fireEvent('settingsChosen', {
                            artifact_types: checkbox_settings,
                            artifact_timeboxes: timebox_settings,
                            artifact_tags: tags,
                            changeset_dates: changeset_dates,
                            query_html: query_html
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
