/*global console, Ext */
Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    items: [
            { 
                xtype: 'rallybutton',
                text: 'Filter Settings',
                height: 25,
                padding: 5,
                handler: function() {
                    Ext.create( 'SettingsDialog', {
                        autoShow: true,
                        draggable: true,
                        title: 'Filter Settings',
                        listeners: {
                            settingsChosen: {
                                scope: this,
                                fn: function( settings ) {
                                    console.log( "settingsChosen:", settings );
                                    // TODO: is there an easier way to get the grandparent?
                                    this.ownerCt.filterSettings = settings;
                                    this.ownerCt._getArtifacts();
                                    this.ownerCt._getChangesets();
                                    var old_message = this.ownerCt.down('#filter_box').down('#message');
                                    if ( old_message ) {
                                        old_message.destroy();
                                    }
                                    this.ownerCt.down('#filter_box').add( 
                                        Ext.create( 'Ext.Component', { 
                                            itemId: 'message',
                                            renderTpl: settings.query_html                                                } ));
                                }
                            }
                        }
                    } );
                }
            },
            {
                xtype: 'container',
                itemId: 'filter_box',
                height: 40,
                padding: 5
            },
            {
                xtype: 'container',
                padding: 5,
                height: 55,
                cls: "redbox",
                itemId: 'note_box',
                layout: { type: 'hbox' },
                items: [
                    {
                        xtype: 'container',
                        flex: 1,
                        items: [{
                            xtype: 'component',
                            cls: 'app_note',
                            html: '<b>Changesets</b><br/>(Double-click--<br/>CS to modify message/Artifact to remove from CS)'
                        }]
                    },
                    {
                        xtype: 'container',
                        flex: 1,
                        items: [{
                            xtype: 'component',
                            cls: 'app_note',
                            html: '<b>Artifacts</b><br/>(Drag an artifact onto a changeset to associate it)'
                        }]
                        
                    }
                ]
            },
            {
                xtype: 'container',
                layout: 'hbox',
                itemId: 'tree_box',
                autoScroll: false,
                //style: { overflow: 'auto', overflowX: 'auto' },
                items: [{
                        xtype: 'container',
                        itemId: 'change_sets',
                        autoScroll: true,
                       
                        flex: 0.5
                    },
                    {
                        xtype: 'container',
                        flex: 0.5,
                        itemId: 'artifacts'
                    }]
            }
            /*,
            { 
                xtype: 'container',
                itemId: 'tree_box',
                padding: 5,
                layout: { type: 'hbox' },
                scroll: false,
                style: { overflow: 'auto' },
                defaults: {
                   scroll: false, 
                   style: { overflow: 'auto'  }
                },
                items: [ 
                         
                     ]
            }
            */
    ],
    launch: function() {
        this.typeMap = {
            'hierarchicalrequirement': { text: "Stories", icon: "https://rally1.rallydev.com/slm/images/icon_story.gif" },
            'task': { text: "Tasks", icon: "https://audemo.rallydev.com/slm/images/icon_task.gif" },
            'defect': { text: "Defects", icon: "https://audemo.rallydev.com/slm/images/icon_defect.gif" }
        };
        
        this.filterSettings = {
            artifact_types: {
                'HierarchicalRequirement': true,
                'Defect': true,
                'Task': false,
                'count_checked': 2
            },
            artifact_timeboxes: {
                iteration: null,
                release: null
            }
        };
        this._getChangesets();
        this._getArtifacts();
    },
    _getArtifactQuery: function() {
        var query = Ext.create('Rally.data.QueryFilter', {
            property: 'ObjectID',
            operator: '>',
            value: 0
        } );
        var iteration = this.filterSettings.artifact_timeboxes.iteration;
        if (  iteration && iteration.data.Name !== "--ANY--" ) {
            query = Ext.create('Rally.data.QueryFilter', {
                property: 'Iteration.Name',
                operator: '=',
                value: iteration.data.Name
            });
        }
        var release = this.filterSettings.artifact_timeboxes.release;
        if (  release && release.data.Name !== "--ANY--" ) {
            query = query.and( Ext.create( 'Rally.data.QueryFilter', {
                property: 'Release.Name',
                operator: '=',
                value: release.data.Name
            }) );
        }
        var tags = this.filterSettings.artifact_tags;
        if ( tags && tags.length > 0 ) {
            var tag_query = null;
            Ext.Array.each( tags, function( tag, index, reverse ) {
                if ( ! tag_query ) {
                    tag_query = Ext.create('Rally.data.QueryFilter', {
                        property: 'Tags.Name',
                        operator: 'contains',
                        value: tag.Name
                    });
                } else {
                    tag_query = tag_query.or( 
                        Ext.create('Rally.data.QueryFilter', {
                            property: 'Tags.Name',
                            operator: 'contains',
                            value: tag.Name
                        })
                    );
                }
            } );
            query = query.and( tag_query );
        }
        
        return query;
    },
    _getChangesetQuery: function() {
        var query = Ext.create('Rally.data.QueryFilter', {property: 'ObjectID', operator: '>', value: 0} );
        if (this.filterSettings.changeset_dates ) {
            if ( this.filterSettings.changeset_dates.start ) {
                query = query.and( Ext.create( 'Rally.data.QueryFilter', {
                    property: 'CommitTimestamp',
                    operator: '>=',
                    value: this.filterSettings.changeset_dates.start
                }) );
            }
            if ( this.filterSettings.changeset_dates.end ) {
                query = query.and( Ext.create( 'Rally.data.QueryFilter', {
                    property: 'CommitTimestamp',
                    operator: '<=',
                    value: this.filterSettings.changeset_dates.end
                }) );
            }
        }
        return query;
    },
    _getArtifacts: function() {
        console.log( "_getArtifacts" );
        this.artifact_list = [];
        if ( this.artifact_tree ) { this.artifact_tree.destroy(); }

        var selected_types = this.filterSettings.artifact_types;
        this.artifact_catch = selected_types.count_checked;

        var filter = this._getArtifactQuery();
        
        if ( selected_types.HierarchicalRequirement ) {
            console.log("searching for stories", filter, this.artifact_catch);
            Ext.create('Rally.data.WsapiDataStore', {
                model: 'User Story',
                autoLoad: true,
                fetch: ['FormattedID','Name','ObjectID'],
                filters: filter ,
                listeners: {
                    load: this._onArtifactsLoaded,
                    scope: this
                }
            });
        }
        if ( selected_types.Defect ) {
            console.log("searching for defects",filter, this.artifact_catch);
            Ext.create('Rally.data.WsapiDataStore', {
                model: 'Defect',
                autoLoad: true,
                fetch: ['FormattedID','Name','ObjectID'],
                filters: filter,
                listeners: {
                    load: this._onArtifactsLoaded,
                    scope: this
                }
            });
        }
        if ( selected_types.Task ) {
            console.log("searching for tasks", filter, this.artifact_catch);
            Ext.create('Rally.data.WsapiDataStore', {
                model: 'Task',
                autoLoad: true,
                fetch: ['FormattedID','Name','ObjectID'],
                filters: filter,
                listeners: {
                    load: this._onArtifactsLoaded,
                    scope: this
                }
            });
        }
    },
    _getChangesets: function() {
        console.log( "_getChangeSets" );
        var filter = this._getChangesetQuery();
        console.log( "filter:", filter);
        
        Ext.create('Rally.data.WsapiDataStore', {
            model: 'Changeset',
            autoLoad: true,
            fetch: [ 'FormattedID', 'Name', 'Artifacts', 'Revision', 'Message' ],
            filters: filter,
            sorters: [{
                property: 'CommitTimestamp',
                direction: 'DESC'
            }],
            listeners: {
                load: this._onChangesetsLoaded,
                scope: this
            },
            context: {
                project: null
            }
        });
        
    },
    _onArtifactsLoaded: function(store,data,success){
        console.log("_onArtifactsLoaded: ", data, this.artifact_catch);    
        this.artifact_catch--; 
        var that = this;
        
        var type_node = null;
        Ext.Array.each(data, function(record) {
            if ( ! type_node ) {
                type_node = {
                    text: that.typeMap[record.data._type].text,
                    leaf: false,
                    allowDrop: false,
                    allowDrag: false,
                    children: []
                };
            }
            var tree_item = {
                text: record.data.FormattedID + ": " + record.data.Name,
                _ref: record.data._ref,
                icon: that.typeMap[ record.data._type].icon,
                leaf: true,
                allowDrop: false,
                data: { item: record.data }
            };
            type_node.children.push(tree_item);
        });
        if ( type_node ) {
            this.artifact_list.push(type_node);
        }
        
        Ext.define( 'ArtifactTreeNodes', {
            extend: 'Ext.data.Model',
            fields: [
                { name: 'text', type: 'string' },
                { name: 'leaf', type: 'boolean' },
                { name: 'icon', type: 'string' },
                { name: 'allowDrop', type: 'boolean' },
                { name: '_ref', type: 'string' }
            ]
        } );
        
        if ( this.artifact_catch <= 0 ) {
            var artifact_store = Ext.create('Ext.data.TreeStore', {
                model: "ArtifactTreeNodes",
                root: {
                    allowDrop: false,
                    expanded: true,
                    children: this.artifact_list
                }
            });    
            this._showArtifactTree( artifact_store );
        }
    },
    _showArtifactTree: function( store ) {
        if ( this.artifact_tree ) { this.artifact_tree.destroy(); }
        var tree_height = 0.7 * this.getHeight();

        this.artifact_tree = Ext.create('Ext.tree.Panel', {
            height: tree_height,
            viewConfig: {
                plugins: {
                    ptype: 'treeviewdragdrop'
                },
                copy: true,
                listeners: {
                    drop: function (node, data, overModel, dropPosition) {         
                        console.log( "drop:", node, data);       
                    }     
                }
            },
            store: store,
            rootVisible: false,
            listeners: {
                beforenodedrop: {
                    fn:function(e) {
                        console.log("beforenodedrop");
                        return true;
                    }
                }
            }
        });
        this.down('#artifacts').add( this.artifact_tree );
    },
    _onChangesetsLoaded: function(store,data,success){
        console.log("_onChangesetsLoaded: ", data);   
        var that = this;
        var records = [];    
        Ext.Array.each(data, function(record) {
            var children = [];
            Ext.Array.each( record.data.Artifacts, function( child ) {
                children.push( {
                    text: child.FormattedID + ": " + child.Name,
                    leaf: true,
                    data: { item: child },
                    icon: that.typeMap[ child._type.toLowerCase() ].icon,
                    allowDrop: false,
                    _ref: child._ref
                } );
            } );
            
            var tree_item = {
                text: record.data.Revision + ": " + record.data.Message,
                _ref: record.data._ref,
                allowDrop: true,
                data: { Changeset: record.data },
                allowDrag: false,
                leaf: false
            };
            
            //if ( children.length !== 0 ) {
                tree_item.children = children;
            //}
            records.push(tree_item);
        }); 
        
        Ext.define( 'ChangesetTreeNodes', {
            extend: 'Ext.data.Model',
            fields: [
                { name: 'Number', type: 'string' },
                { name: 'Message', type: 'string' },
                { name: 'text', type: 'string' },
                { name: 'leaf', type: 'boolean' },
                { name: 'icon', type: 'string' },
                { name: 'allowDrop', type: 'boolean' },
                { name: '_ref', type: 'string' }
            ]
        } );

        var change_store = Ext.create('Ext.data.TreeStore', {
            model: "ChangesetTreeNodes",
            root: {
                expanded: true,
                allowDrop: false,
                children: records
            }
        });
        
        that._showChangesetTree(change_store);
    },
    _showChangesetTree: function( change_store ) {
        var that = this;
        
        if ( this.cr_tree ) { this.cr_tree.destroy(); }
        var tree_height = 0.65 * this.getHeight();
        var good_width = 0.5 * this.getWidth();
        var tree_width = 1000;
        
        var outer_container = this.down('#change_sets');
        outer_container.width = good_width;
        outer_container.height = tree_height;
        
        this.cr_tree = Ext.create('Ext.tree.Panel', {
            autoScroll: false,
            scroll: false,
            //height: tree_height,
            width: tree_width,
            viewConfig: {
                plugins: {
                    ptype: 'treeviewdragdrop'
                },
                copy: true,
                listeners: {
                    afterrender: function( tree, options ) {
                        var height = tree.getHeight();
                        console.log( height );
                        tree.setHeight( height * 1.25 );
                    },
                    itemdblclick: function( tree, record, itemHtml, index, evt, options ) {
                        console.log( "Doubleclicked!", record );
                        var cs = null;
                        if ( record.raw && record.raw.data.Changeset ) {
                            // this is a changeset folder
                            cs = record.raw.data.Changeset;
                            Ext.create( 'ChangeNameDialog', {
                                autoShow: true,
                                draggable: true,
                                changeset: cs,
                                title: 'Filter Settings',
                                listeners: {
                                    settingsChosen: {
                                        scope: this,
                                        fn: function( settings ) {
                                            console.log( "settingsChosen:", settings );
                                            var new_message = settings.message;
                                            Rally.data.ModelFactory.getModel({
                                                type: 'Changeset',
                                                success: function(cs_model) {
                                                    cs_model.load( cs.ObjectID, {
                                                        fetch: [ 'Message' ],
                                                        callback: function( record, operation ) {
                                                            if ( operation.wasSuccessful() ) {
                                                                var message = new_message;
                                                                record.set( 'Message', message);
                                                                record.save( {
                                                                    callback: function( resultset, operation ) {
                                                                        console.log( "After saving:", resultset );
                                                                        if ( operation.wasSuccessful() ) {
                                                                            var that = tree.ownerCt.ownerCt.ownerCt.ownerCt;
                                                                            that._getChangesets();
                                                                        }
                                                                    }
                                                                } ); 
                                                            } 
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    }
                                }
                            } );
                        } else {
                            // this is an artifact to be removed
                            var artifact = null;
                            if ( record.raw ) {
                                artifact = record.raw.data.item; 
                            } else {
                                // dragged but not refreshed
                                artifact = tree.getRecord(itemHtml).data;
                            }                                                
                            
                            cs = record.parentNode.raw.data.Changeset;

                            console.log( tree );
                           // tree.getStore().remove( itemHtml );
                            
                            Rally.data.ModelFactory.getModel({
                                type: 'Changeset',
                                success: function(cs_model) {
                                    cs_model.load( cs.ObjectID, {
                                        fetch: [ 'Artifacts' ],
                                        
                                        callback: function( changeset, operation ) {
                                            if ( operation.wasSuccessful() ) {
                                                var artifacts = [];
                                                Ext.Array.each( changeset.get('Artifacts'), function( item ) {
                                                    if ( item._ref !== artifact._ref ) {
                                                        artifacts.push( { _ref: item._ref } );
                                                    }
                                                } );
                                                                                           
                                                changeset.set( 'Artifacts', artifacts);
                                                changeset.save( {
                                                    callback: function( resultset, operation ) {
                                                        console.log( "After saving:", resultset );
                                                        if ( operation.wasSuccessful() ) {
                                                            record.remove(false);
                                                        }
                                                    }
                                                } );
                                                 
                                            } 
                                        }
                                    });
                                }
                            });
                           
                        }
                    },
                    drop: function (node, data, overModel, dropPosition) { 
                        console.log( "drop (on CS Tree)", node, data );
                        var item = data.view.getRecord( data.item );
                        if ( item.raw ) { 
                            item = item.raw.data.item; 
                        } 
                        
                        console.log( "dropped item: ", item );
                        var changeset = null;
                        if ( data.view.getRecord(node) ) {
                            changeset = data.view.getRecord( node ).raw.data.Changeset;
                        } else {
                            changeset = overModel.raw.data.Changeset;
                        }
                        
                        Rally.data.ModelFactory.getModel({
                            type: 'Changeset',
                            success: function(cs_model) {
                                cs_model.load( changeset.ObjectID, {
                                    fetch: [ 'Artifacts' ],
                                    callback: function( record, operation ) {
                                        if ( operation.wasSuccessful() ) {
                                            var artifacts = Ext.clone( record.get( 'Artifacts' ) );
                                            artifacts.push({ _ref: item._ref });
                                            record.set( 'Artifacts', artifacts);
                                            
                                            record.save( {
                                                callback: function( resultset, operation ) {
                                                    console.log( "After saving:", resultset );
                                                }
                                            } ); 
                                            
                                        } 
                                    }
                                });
                            }
                        });
                                          
                    }     
                }
            },
            
            cls: "box",
            store: change_store,
            rootVisible: false
        });
        this.down('#change_sets').add( this.cr_tree );
    }
});


