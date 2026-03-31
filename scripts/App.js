import { Dictionary } from './Dictionary.js';
import { BalconyMenu } from './ui/BalconyMenu.js?v=1';
import { RailinglMenu } from './ui/RailinglMenu.js?v=1';
import { TopMenu } from './ui/TopMenu.js';
import { ViewModeControls } from './ui/ViewModeControls.js';
import { ARDialog } from './ui/ARDialog.js';
import { View3D } from './View3D.js';
import { View2D } from './View2D.js';
import { Shape, SHAPE_TYPE_R, SHAPE_TYPE_L, SHAPE_TYPE_S, SHAPE_TYPE_U } from './Shape.js';
import { EDIT_MODE_SHAPE, EDIT_MODE_WALLS, EDIT_MODE_DECKING, EDIT_MODE_SUPPORTS, VIEW_MODE_2D, VIEW_MODE_3D } from './Constants.js';

const isObject = ( value ) =>
{
	if( value == null ) return false;
	if( typeof value !== 'object' ) return false;
	if( Array.isArray( value ) ) return false;
	
	return value.constructor === Object;
};

const save = ( blob, filename ) =>
{
	const link = document.createElement( 'a' );
	
	link.href = URL.createObjectURL( blob );
	link.download = filename;
	link.click();
};

const saveString = ( text, filename ) => save( new Blob( [ text ], { type: 'text/plain' } ), filename );

const htmlToElements = ( htmlString ) =>
{
	const template = document.createElement( 'template' );
	
	template.innerHTML = htmlString.trim(); 

	return template.content.childNodes; 
};

class App
{
	constructor( options ) 
	{
		console.log( 'Apppp!' );
			
		document.body.append( ... htmlToElements
		(
			'<div id="topMenu"></div>' +
			'<div id="leftMenu"></div>' +
			'<div id="editor">' +
				'<div class="relative">' +
					'<div id="viewModeControls"></div>' +
					'<div id="view3d"></div>' +
					'<div id="view2d"></div>' +
				'</div>' +
			'</div>' +
			'<div id="dialogs">' +
				'<!--<div class="dialog-backdrop">' +
					'<div class="dialog"></div>' +
				'</div>-->' +
			'<div>'
		) );
		
		const isEditable = options?.editable === false ? false : true;

		let editMode = null;
		let shape = null;
		let activeMenu = null;
		let arDialog = null;
		
		const dialogContainerElement = document.querySelector( '#dialogs' );
		const viewModeControlsElement = document.querySelector( '#viewModeControls' );
		const view3dElement = document.querySelector( '#view3d' );
		const view2dElement = document.querySelector( '#view2d' );
		const leftMenuElement = document.querySelector( '#leftMenu' );
		const topMenuElement = document.querySelector( '#topMenu' );
		
		const view3d = new View3D();
		const view2d = new View2D();
		const viewModeControls = new ViewModeControls();	
		const balconyMenu = new BalconyMenu();	
		const railinglMenu = new RailinglMenu();
		const topMenu = new TopMenu( isEditable );
		
		

		const onTabSelect = () =>
		{
			leftMenuElement.innerHTML = '';
			activeMenu = null;
			
			//
			
			const selectedTabIndex = topMenu.getSelectedTabIndex();

			if( selectedTabIndex === 0 )
			{
				activeMenu = balconyMenu;
			}
			else if( selectedTabIndex === 1 )
			{
				activeMenu = railinglMenu;
			}

			
			if( activeMenu )
			{
				leftMenuElement.append( activeMenu.getElement() );
				activeMenu.update();
			}
			
			onEditModeChange();
		};
		
		const onEditModeChange = () =>
		{
			const selectedTabIndex = topMenu.getSelectedTabIndex();
			
			editMode = activeMenu?.getEditMode();
			
			view2d.setEditMode( editMode );
			view3d.setEditMode( editMode );
		};

		const onShapeSelect = ( json = null ) =>
		{
			console.log( balconyMenu.getShapeType() );
			const type = balconyMenu.getShapeType() ?? SHAPE_TYPE_R;
			
			let isRestored = false;
			
			if( isObject( json ) )
			{
				try
				{
					shape = new Shape( json ?? type );
					isRestored = true;
				}
				catch( error )
				{
					console.log( error );
					shape = new Shape( type );
				}
			}
			else 
			{
				shape = new Shape( type );
			}

			balconyMenu.setShape( shape );
			railinglMenu.setShape( shape );
			view2d.setShape( shape );	

			if( isRestored )
			{
				view2d.fitToScreen();
			}
		};

		const onViewModeChange = () =>
		{
			if( viewModeControls.getMode() == VIEW_MODE_2D )
			{
				balconyMenu.setShapeEditEnabled( true );
				
				view3dElement.classList.add( 'hidden' );
				view3d.setActive( false );
				view3d.setShape( null );
				
				view2dElement.classList.remove( 'hidden' );
				view2d.setActive( true );
			}
			else 
			{
				balconyMenu.setShapeEditEnabled( false );
				
				view2d.setActive( false );
				view2dElement.classList.add( 'hidden' );
				
				view3dElement.classList.remove( 'hidden' );
				view3d.setShape( shape );
				view3d.setActive( true );				
			}
		};
		
		viewModeControls.addEventListener( 'ar', () => 
		{			
			if( arDialog == null || arDialog.getVersion() !== view3d.getVersion() )
			{
				arDialog?.dispose();
				arDialog = new ARDialog( view3d );
			}
			
			dialogContainerElement.append( arDialog.getElement() );			
		} );
		
		viewModeControls.addEventListener( 'change', () => onViewModeChange() );

		balconyMenu.addEventListener( 'focus', ( event ) => 
		{
			const { inputType, name, uuid } = event;
			
			if( inputType === 'line' )
			{
				view2d.setHighlightedLine( name );
			}
			else if( inputType === 'distanceBetweenSupports' )
			{
				view2d.setHighlightedDistance( uuid );
			}
		} );
		
		balconyMenu.addEventListener( 'blur', ( event ) => 
		{
			const { inputType } = event;
			
			if( inputType === 'line' )
			{
				view2d.setHighlightedLine( null );
			}
			else if( inputType === 'distanceBetweenSupports' )
			{
				view2d.setHighlightedDistance( null );
			}
		} );
		
		topMenu.addEventListener( 'tabSelect', onTabSelect );
		topMenu.addEventListener( 'back', () => window.location.href = '../select.php?project_id=' + options.projectId + '&product_id=' + options.productId );
		topMenu.addEventListener( 'save', () =>
		{
			const body = new FormData();
			
			body.append( 'project_id', options.projectId );
			body.append( 'product_id', options.productId );
			body.append( 'data_id', options.dataId );
			body.append( 'data', JSON.stringify( shape.toJSON() ) );
			
			fetch( '../api/data/save', { method:'POST', headers:{}, body } )
			.then( response =>
			{
				if( !response.ok ) throw new Error( 'Response status ', response.status );
				
				return response.json();
			} )
			.then( json => 
			{
				console.log( 'Server response ', json );
				
				if( json.status === 'done' )
				{
					window.onbeforeunload = null;
					window.location.href = '../select.php?project_id=' + options.projectId + '&product_id=' + options.productId
				}				
			} )
			.catch( error => 
			{
				console.error( 'Sending failed:', error );				
			} );
		} );
		
		/*topMenu.addEventListener( 'export', ( event ) =>
		{
			const json = JSON.stringify( shape.toJSON() );
			
			console.log( json );
			saveString( json, 'data.json' );
		} );
		
		topMenu.addEventListener( 'import', ( event ) =>
		{
			const input = document.createElement( 'input' );
			
			input.type = 'file';
			input.accept = 'application/json';
			input.onchange = ( event ) =>
			{
				const file = event.target.files[ 0 ];
				
				if( file )
				{
					const reader = new FileReader();

					reader.readAsText( file );
					reader.onload = () =>
					{
						try
						{
							shape = new Shape( JSON.parse( reader.result ) );

							balconyMenu.setShape( shape );
							
							view2d.setShape( shape );
							view2d.fitToScreen();
								
							if( viewModeControls.getMode() == VIEW_MODE_3D )
							{
								view3d.setShape( shape );
								view3d.setActive( true );
							}
						}
						catch( error )
						{
							console.log( error );
						}
					};
				}

				event.target.value = '';
			};
			
			input.click();
		} );*/
		
		balconyMenu.addEventListener( 'shapeSelect', () => onShapeSelect()  ); 
		balconyMenu.addEventListener( 'editModeChange', onEditModeChange );
		
		//
		
		view3dElement.append( view3d.getElement() );
		view2dElement.append( view2d.getElement() );
		viewModeControlsElement.append( viewModeControls.getElement() );
		topMenuElement.append( topMenu.getElement() );

		//

		onShapeSelect( options.productData );	
		onViewModeChange();		
		
		topMenu.setSelectedTabIndex( 0 );
		
		//
		
		const json = options.productData ? JSON.stringify( options.productData ) : null;
		
		window.onbeforeunload = ( event ) => 
		{
			const isEqual = ( json === JSON.stringify( shape.toJSON() ) );

			if( !isEqual )
			{
				event.preventDefault();
				event.returnValue = '';
			}
		};
	}
}

export { App };  