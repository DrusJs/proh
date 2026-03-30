import { EventDispatcher } from 'three';
import { Dictionary } from '../Dictionary.js';
import { 
	Shape,
	MAX_DISTANCE_BETWEEN_SUPPORTS, MIN_DISTANCE_BETWEEN_SUPPORTS, 
	MIN_SUPPORT_HEIGHT, MAX_SUPPORT_HEIGHT, 
	DECKING_ORIENTATION_HORIZONTAL, DECKING_ORIENTATION_VERTICAL,
	DECKING_BOARD_WIDTH_140, DECKING_BOARD_WIDTH_200,
	SUPPORT_TYPE_WALL_MOUNT, SUPPORT_TYPE_POST,
	WALL_MATERIAL_BRICK, WALL_MATERIAL_RUBBLE, WALL_MATERIAL_CONCRETE, WALL_MATERIAL_OTHER,
	SHAPE_TYPE_R, SHAPE_TYPE_L, SHAPE_TYPE_S, SHAPE_TYPE_U, 
} from '../Shape.js';
import { EDIT_MODE_SHAPE, EDIT_MODE_WALLS, EDIT_MODE_DECKING, EDIT_MODE_SUPPORTS } from '../Constants.js';

class BalconyMenu extends EventDispatcher
{
	constructor() 
	{
		super();

		this._change = ( event ) => this._onChange( event );
		this._deckingColorChanged = ( event ) => this._onDeckingColorChanged( event );
		this._deckingRecomputed = ( event ) => this._onDeckingRecomputed( event );
		this._supportsRecomputed = ( event ) => this._onSupportsRecomputed( event );
		this._supportHeightChanged = ( event ) => this._onSupportHeightChanged( event );
		this._supportPositionChanged = ( event ) => this._onSupportPositionChanged( event );
		this._supportTypeChanged = ( event ) => this._onSupportTypeChanged( event );
		this._elevationChanged = ( event ) => this._onElevationChanged( event );
		this._wallAdded = ( event ) => this._onWallAdded( event );
		this._wallRemoved = ( event ) => this._onWallRemoved( event );
		this._wallMaterialChanged = ( event ) => this._onWallMaterialChanged( event );

		this._editMode = null;
		this._enabled = true;
		this._shape = null;
		
		this._domElement = document.createElement( 'div' );
		this._accordions = [];

		this._createAccordion( Dictionary.get( 'shape' ), EDIT_MODE_SHAPE );
		this._createAccordion( Dictionary.get( 'walls' ), EDIT_MODE_WALLS );
		this._createAccordion( Dictionary.get( 'covering_cladding' ), EDIT_MODE_DECKING );
		this._createAccordion( Dictionary.get( 'posts' ), EDIT_MODE_SUPPORTS );

		const shapePanel = this._getPanel( EDIT_MODE_SHAPE );
		const deckingColorList = document.createElement( 'div' );
		
		deckingColorList.classList.add( 'decking-color-list' );
		
		Shape.getDeckingColorList().forEach( color =>
		{
			const { hex, key } = color;
			const colorItem = document.createElement( 'div' );
			const colorLabel = document.createElement( 'label' );
			
			colorLabel.textContent = Dictionary.get( key );
			
			colorItem.appendChild( colorLabel );
			
			colorItem.classList.add( 'decking-color-list-item' );
			colorItem.style.backgroundColor = hex;
			colorItem.dataset.hex = hex;
			colorItem.onclick = () => this._shape.setDeckingColor( hex );
			
			deckingColorList.appendChild( colorItem );
		} );
		
		this.deckingColorList = deckingColorList;
		
		const shapeList = document.createElement( 'div' );
		const strokeWidth = 2;
		
		shapeList.classList.add( 'shape-list' );
		shapeList.innerHTML = 
				'<div class="shape-list-item" data-shape="' + ( SHAPE_TYPE_R ) + '">' +
					'<span>' +
						'<svg width="75" height="56" viewBox="0 0 75 56" fill="none" ' +
						'xmlns="http://www.w3.org/2000/svg">' +
						'<rect x="1.72414" y="1.72414" width="71.2271" height="51.7465" ' +
						'stroke-width="' + strokeWidth + '" />' +
						'</svg>' +
					'</span>' +
				'</div>' +
				'<div class="shape-list-item" data-shape="' + ( SHAPE_TYPE_L ) + '">' +
					'<span>' +
						'<svg width="75" height="56" viewBox="0 0 75 56" fill="none" ' +
						'xmlns="http://www.w3.org/2000/svg">' +
						'<path d="M28.3799 1.72461V33.3936H72.9512V53.4707H1.72461V1.72461H28.3799Z" ' +
						'stroke-width="' + strokeWidth + '" />' +
						'</svg>' +
					'</span>' +
				'</div>' +
				'<div class="shape-list-item" data-shape="' + ( SHAPE_TYPE_U ) + '">' +
					'<span>' +
						'<svg width="75" height="56" viewBox="0 0 75 56" fill="none" ' +
						'xmlns="http://www.w3.org/2000/svg">' +
						'<path ' +
						'd="M24.5352 1.72461V28.7373H52.4834V1.72461H72.9512V53.4707H1.72461V1.72461H24.5352Z" ' +
						'stroke-width="' + strokeWidth + '" />' +
						'</svg>' +
					'</span>' +
				'</div>' +
				'<div class="shape-list-item" data-shape="' + ( SHAPE_TYPE_S ) + '">' +
					'<span>' +
						'<svg width="75" height="67" viewBox="0 0 75 67" fill="none" ' +
						'xmlns="http://www.w3.org/2000/svg">' +
						'<path ' +
						'd="M28.3799 1.72461V25.7246H72.9512V64.7754H48.8281V42.7754H1.72461V1.72461H28.3799Z" ' +
						'stroke-width="' + strokeWidth + '" />' +
						'</svg>' +
					'</span>' +
				'</div>';

		this.shapeListItems = [ ... shapeList.querySelectorAll( '[data-shape]' ) ];
		this.shapeListItems.forEach( element =>
		{
			const { shape } = element.dataset;

			element.onclick = () => 
			{
				this._selectShapeListItem( shape );	
				this.dispatchEvent( { type:'shapeSelect' } );
			};
		} );
		
		///
		
		const shapeControls = document.createElement( 'div' );
		
		shapeControls.classList.add( 'shape-controls' );

		shapePanel.append( shapeList, document.createElement( 'hr' ), shapeControls );

		this.setEditMode( EDIT_MODE_SHAPE );		
	}
	
	_selectShapeListItem( type )
	{
		this.shapeListItems.forEach( element =>
		{
			const { shape } = element.dataset;
			
			element.classList[ ( shape == type ) ? 'add' : 'remove' ]( 'active' );
		} );
	}
	
	_createAccordion( name, editMode )
	{
		const accordion = document.createElement( 'button' );
		
		accordion.classList.add( 'accordion' );
		accordion.dataset.mode = editMode;
		accordion.textContent = name;
		accordion.onclick = () => this.setEditMode( accordion.dataset.mode );
		
		const panel = document.createElement( 'div' );
		
		panel.classList.add( 'panel' );
		
		this._domElement.append( accordion, panel );
		
		this._accordions.push( accordion );
	}
	
	_updatePanels()
	{
		this._accordions.forEach( accordion => 
		{
			const panel = accordion.nextElementSibling;
			
			if( accordion.classList.contains( 'active' ) )
			{
				panel.style.maxHeight = panel.scrollHeight + 'px';
			}
		} );
	}
	
	_clearPanel( mode )
	{
		const panel = this._getPanel( mode );
		
		if( panel ) 
		{
			panel.innerHTML = '';
		}
	}
	
	_getAccordion = ( mode ) => this._accordions.find( accordion => accordion.dataset.mode === mode );
	
	_getPanel = ( mode ) => this._getAccordion( mode ).nextElementSibling;

	getEditMode = () => this._editMode; 
	setEditMode = ( mode ) =>
	{
		if( this._editMode !== mode )
		{
			this._editMode = mode;
			
			if( this._editMode == EDIT_MODE_SUPPORTS )
			{
				this._fillSupportsPanel();
			}
			
			this._accordions.forEach( accordion => 
			{
				if( accordion.dataset.mode !== mode )
				{
					accordion.classList.remove( 'active' );
					accordion.nextElementSibling.style.maxHeight = null;
				}
				else 
				{
					accordion.classList.add( 'active' );
					
					const panel = accordion.nextElementSibling;
					panel.style.maxHeight = panel.scrollHeight + 'px';
				}
			} );
			
			
			this.dispatchEvent( { type:'editModeChange' } );
		}
	}
	
	getEnabled = () => this._enabled; 
	setEnabled = ( value ) =>
	{
		value = !!value;

		if( this._enabled !== value )
		{
			this._enabled = value;

			const shapePanel = this._getPanel( EDIT_MODE_SHAPE );

			shapePanel.classList[ this._enabled ? 'remove' : 'add' ]( 'disabled' );

			const elements = 
			[
				... shapePanel.querySelectorAll( 'select' ),
				... shapePanel.querySelectorAll( 'button' ),
				... shapePanel.querySelectorAll( 'input[type=number]' ),
			];
			
			elements.forEach( element => element.disabled = !this._enabled  );
			
			this.shapeListItems.forEach( element => element.classList[ this._enabled ? 'remove' : 'add' ]( 'disabled' ) );
		}
	}
	
	getDeckingColor = () => this._getPanel( EDIT_MODE_DECKING ).querySelector( 'input[type=color]' ).value;
	setDeckingColor = ( color ) => this._getPanel( EDIT_MODE_DECKING ).querySelector( 'input[type=color]' ).value = color;

	getShapeType()
	{
		const element = this.shapeListItems.find( element => element.classList.contains( 'active' ) );
		
		return element ? element.dataset.shape : null;
	}
	
	getElement = () => this._domElement;
	
	update()
	{
		this._updatePanels();
	}
	
	_onChange()
	{
		const shape = this._shape;
		const shapePanel = this._getPanel( EDIT_MODE_SHAPE );
		const shapeControls = shapePanel.querySelector( '.shape-controls' );

		shapeControls.querySelectorAll( 'input[type=number]' ).forEach( element =>
		{
			const name = element.dataset.name;
			const length = shape.getLineLength( name );

			element.value = length;
		} );
	}
	
	_updateWallsPanel()
	{
		const shape = this._shape;
		const wallsPanel = this._getPanel( EDIT_MODE_WALLS );
		
		wallsPanel.querySelectorAll( 'input[type=checkbox]' ).forEach( element =>
		{
			const name = element.dataset.name;
			const hasWall = shape.getLineWalled( name );
			
			element.checked = hasWall;
		} );
	}
	
	_onSupportsRecomputed()
	{
		this._clearSupportsPanel();
		
		if( this._editMode == EDIT_MODE_SUPPORTS )
		{
			this._fillSupportsPanel();
		}
	}
	
	_clearSupportsPanel()
	{
		const panel = this._getPanel( EDIT_MODE_SUPPORTS );
		
		if( Number.isFinite( panel.supportsVersion ) )
		{
			panel.innerHTML = '';
			panel.supportsVersion = null;
		
			console.log( '_clearSupportsPanel' );
		}
	}
	
	_fillSupportsPanel()
	{
		const shape = this._shape;
		const panel = this._getPanel( EDIT_MODE_SUPPORTS );
		const supportsVersion = shape.getSupportsVersion();

		if( panel.supportsVersion != supportsVersion )
		{
			this._clearSupportsPanel();
			
			panel.supportsVersion = supportsVersion;
			
			console.log( '_fillSupportsPanel()' );
			
			//
				const elevation = shape.getElevation();
				const elevationGroup = document.createElement( 'div' );
				const elevationInput = document.createElement( 'input' );
				const elevationCheckboxGroup = document.createElement( 'div' );
				const elevationCheckbox = document.createElement( 'input' );
				const elevationLabel = document.createElement( 'label' );
				
				elevationInput.type = 'number';
				elevationInput.min = MIN_SUPPORT_HEIGHT;
				elevationInput.max = MAX_SUPPORT_HEIGHT;
				elevationInput.value = elevation;
				elevationInput.step = 10;
				elevationInput.onchange = () => shape.setElevation( elevationInput.valueAsNumber );
				
				elevationCheckbox.type = 'checkbox';
				elevationCheckbox.id = 'elevation-checkbox';
				elevationCheckbox.checked = shape.getSupports().every( support => support.height === elevation ); // Только если высота всех опор равна elevation
				elevationCheckbox.onchange = () =>
				{
					elevationInput.disabled = !elevationCheckbox.checked;

					if( elevationCheckbox.checked )
						shape.setElevation( elevationInput.valueAsNumber );
					
					this._updateSupportsPanel( 'elevationCheckbox.onchange' ); // ???
				};
				
				elevationLabel.innerHTML = Dictionary.get( 'for_all' );
				elevationLabel.setAttribute( 'for', 'elevation-checkbox' );
					
				elevationCheckboxGroup.classList.add( 'checkbox' );
				elevationCheckboxGroup.append( elevationCheckbox, elevationLabel );
						
				elevationGroup.classList.add( 'row' );
				elevationGroup.classList.add( 'elevation-row' );
				elevationGroup.append( elevationInput, elevationCheckboxGroup );
				
			//
			
			panel.append( elevationGroup );
			panel.append( document.createElement( 'hr' ) );

			const supportTypes = 
			[ 
				{ value:SUPPORT_TYPE_POST, name:Dictionary.get( 'posts' ) },
				{ value:SUPPORT_TYPE_WALL_MOUNT, name:Dictionary.get( 'wall_mount' ) },
			];

			const supportsGroup = document.createElement( 'div' );		

			supportsGroup.classList.add( 'supports' );
			supportsGroup.dataset.group = 'supports'
			
			shape.getSupports().forEach( support =>
			{
				const { displayName, uuid, type, height, hasWall } = support;
				
				const group = document.createElement( 'div' );	 
				const label = document.createElement( 'span' );
				const heightInput = document.createElement( 'input' );
				const typeSelect = document.createElement( 'select' );
				
				group.dataset.uuid = uuid;
				
				label.textContent = displayName;

				heightInput.type = 'number';
				heightInput.min = MIN_SUPPORT_HEIGHT;
				heightInput.max = MAX_SUPPORT_HEIGHT;
				heightInput.value = height;
				heightInput.step = 10;
				heightInput.disabled = type !== SUPPORT_TYPE_POST || elevationCheckbox.checked;
				heightInput.classList[ heightInput.disabled ? 'add' : 'remove' ]( 'disabled' );
				heightInput.onchange = () => shape.setSupportHeight( uuid, heightInput.valueAsNumber );

				typeSelect.disabled = !hasWall;
				typeSelect.classList[ typeSelect.disabled ? 'add' : 'remove' ]( 'disabled' );
				typeSelect.onchange = () => shape.setSupportType( uuid, typeSelect.selectedOptions[ 0 ].value );
				
				supportTypes.forEach( ( data, index ) =>
				{
					const { name, value } = data;
					const option = document.createElement( 'option' );
					
					option.textContent = name;
					option.value = value;
					
					typeSelect.appendChild( option );
					
					if( type === value )
					{
						typeSelect.selectedIndex = index;
					}
				} );
				
				group.classList.add( 'row' );
				group.append( label, heightInput, typeSelect );
	
				supportsGroup.appendChild( group );
			} );
			
			panel.appendChild( supportsGroup );
			
			const distancesBettweenSupports = shape.getDistancesBetweenSupports();
			const distancesGroup = document.createElement( 'div' );
			
			distancesGroup.classList.add( 'distances' );
			distancesGroup.dataset.group = 'distances';
			
			if( distancesBettweenSupports.length > 0 )
			{
				distancesBettweenSupports.forEach( distance =>
				{
					const { uuid, displayName, value } = distance;
					
					const group = document.createElement( 'div' );	 
					const label = document.createElement( 'span' );
					const input = document.createElement( 'input' );

					label.textContent = displayName;

					input.type = 'number';
					input.min = MIN_DISTANCE_BETWEEN_SUPPORTS;
					input.max = MAX_DISTANCE_BETWEEN_SUPPORTS;
					input.value = value;
					input.step = 10;
					input.onchange = () => shape.setDistanceBetweenSupports( uuid, input.valueAsNumber );
					input.onfocus = () => this.dispatchEvent( { type:'focus', inputType:'distanceBetweenSupports', uuid } );
					input.onblur = () => this.dispatchEvent( { type:'blur', inputType:'distanceBetweenSupports' } );
					input.onpointerdown = () => 
					{
						if( document.activeElement !== input )
						{
							// console.log( 'focus' );
							input.focus();
						}
					};
					
					group.dataset.uuid = uuid;
					group.classList.add( 'row' );
					group.append( label, input );
					
					distancesGroup.append( group );
				} );
			}
	
			panel.appendChild( distancesGroup );
		}
		else 
		{
			console.warn( 'skip -> _fillSupportsPanel()' );
		}
	}
	
	_updateSupportsPanel( callerName )
	{
		//console.log( '_updateSupportsPanel', callerName );
		
		const shape = this._shape;
		const panel = this._getPanel( EDIT_MODE_SUPPORTS );
		const supportsGroup = panel.querySelector( 'div[data-group=supports]' );
		const distancesGroup = panel.querySelector( 'div[data-group=distances]' );
		const elevationCheckbox = panel.querySelector( 'input[type=checkbox]' );
		const elevationInput = panel.querySelector( 'input[type=number]' );
		
		if( elevationInput )
		{
			elevationInput.classList[ elevationInput.disabled ? 'add' : 'remove' ]( 'disabled' );
		}
		
		supportsGroup?.querySelectorAll( 'div[data-uuid]' ).forEach( group =>
		{
			const { uuid } = group.dataset;
			const heightInput = group.querySelector( 'input[type=number]' );
			const typeSelect = group.querySelector( 'select' );
			
			const { type, hasWall } = shape.getSupport( uuid );
			
			typeSelect.selectedIndex = [ ... typeSelect.options ].findIndex( option => option.value === type );
			typeSelect.disabled = !hasWall;
			typeSelect.classList[ typeSelect.disabled ? 'add' : 'remove' ]( 'disabled' );
			
			heightInput.disabled = type !== SUPPORT_TYPE_POST || elevationCheckbox.checked;
			heightInput.classList[ heightInput.disabled ? 'add' : 'remove' ]( 'disabled' );
		} );
	}
	
	_onWallAdded( event )
	{
		this._updateWallsPanel();
		//this._updateSupportsPanel( '_onWallAdded' );
	}
	
	_onWallRemoved( event )
	{
		this._updateWallsPanel();
		//this._updateSupportsPanel( '_onWallRemoved' );
	}
	
	_onWallMaterialChanged( event )
	{
		//this._updateSupportsPanel( '_onWallMaterialChanged' );
	}
	
	_updateDeckingColorList()
	{
		const deckingColor = this._shape.getDeckingColor();
		
		console.log( deckingColor );
		
		[ ... this.deckingColorList.querySelectorAll( '.decking-color-list-item' ) ].forEach( item =>
		{
			item.classList[ item.dataset.hex == deckingColor ? 'add' : 'remove' ]( 'active' );
		} );
	}
	
	_updateDeckingPanel()
	{
		// console.log( '_updateDeckingPanel' );
		
		const shape = this._shape;
		const orientationList = shape.getDeckingOrientationList();
		const deckingPanel = this._getPanel( EDIT_MODE_DECKING );
		const [ orientationSelect, boardWidthSelect ] = [ ... deckingPanel.querySelectorAll( 'select' ) ];	
		const orientationOptions = [ ... orientationSelect.options ];

		orientationOptions.forEach( option =>
		{
			option.hidden = 
			option.disabled = !orientationList.includes( option.value );
		} );
		
		orientationSelect.selectedIndex = orientationOptions.findIndex( option => option.value == shape.getDeckingOrientation() );
		boardWidthSelect.selectedIndex = [ ... boardWidthSelect.options ].findIndex( option => option.value == shape.getDeckingBoardWidth() );
	}
	
	_onDeckingColorChanged( event )
	{
		this._updateDeckingColorList();
	}
	
	_onDeckingRecomputed( event )
	{
		this._updateDeckingPanel();
	}
	
	_onSupportTypeChanged( event )
	{
		this._updateSupportsPanel( '_onSupportTypeChanged' );
	}
	
	_onElevationChanged( event )
	{
		const shape = this._shape;
		const panel = this._getPanel( EDIT_MODE_SUPPORTS );
		const elevationInput = panel.querySelector( 'input[type=number]' );
		
		elevationInput.value = shape.getElevation();
	}
	
	_onSupportHeightChanged( event )
	{
		const { uuid } = event;
		const shape = this._shape;
		const panel = this._getPanel( EDIT_MODE_SUPPORTS );
		const supportsGroup = panel.querySelector( 'div[data-group=supports]' );
		const group = supportsGroup.querySelector( 'div[data-uuid="' + uuid + '"]' );
		const heightInput = group.querySelector( 'input[type=number]' );

		heightInput.value = shape.getSupport( uuid ).height;
	}
	
	_onSupportPositionChanged( event )
	{
		const shape = this._shape;
		const panel = this._getPanel( EDIT_MODE_SUPPORTS );
		const distancesGroup = panel.querySelector( 'div[data-group=distances]' );
		const distancesBettweenSupports = shape.getDistancesBetweenSupports();
		
		distancesBettweenSupports.forEach( distance =>
		{
			const { uuid, value } = distance;	
			const group = distancesGroup.querySelector( 'div[data-uuid="' + uuid + '"]' );
			const input = group.querySelector( 'input[type=number]' );
			
			input.value = value;
		} );
	}
	
	setShape( shape )
	{
		if( this._shape != shape )
		{
			this._shape?.removeEventListener( 'change', this._change );
			this._shape?.removeEventListener( 'deckingColorChanged', this._deckingColorChanged );
			this._shape?.removeEventListener( 'deckingRecomputed', this._deckingRecomputed );
			this._shape?.removeEventListener( 'supportsRecomputed', this._supportsRecomputed );
			this._shape?.removeEventListener( 'supportHeightChanged', this._supportHeightChanged );
			this._shape?.removeEventListener( 'supportPositionChanged', this._supportPositionChanged );
			this._shape?.removeEventListener( 'supportTypeChanged', this._supportTypeChanged );
			this._shape?.removeEventListener( 'elevationChanged', this._elevationChanged );
			this._shape?.removeEventListener( 'wallAdded', this._wallAdded );
			this._shape?.removeEventListener( 'wallRemoved', this._wallRemoved );
			this._shape?.removeEventListener( 'wallMaterialChanged', this._wallMaterialChanged );
			
			this._shape = shape;
			this._shape.addEventListener( 'change', this._change ); 
			this._shape.addEventListener( 'deckingColorChanged', this._deckingColorChanged );
			this._shape.addEventListener( 'deckingRecomputed', this._deckingRecomputed );
			this._shape.addEventListener( 'supportsRecomputed', this._supportsRecomputed );
			this._shape.addEventListener( 'supportHeightChanged', this._supportHeightChanged );
			this._shape.addEventListener( 'supportPositionChanged', this._supportPositionChanged );
			this._shape.addEventListener( 'supportTypeChanged', this._supportTypeChanged );
			this._shape.addEventListener( 'elevationChanged', this._elevationChanged );
			this._shape.addEventListener( 'wallAdded', this._wallAdded );
			this._shape.addEventListener( 'wallRemoved', this._wallRemoved );
			this._shape.addEventListener( 'wallMaterialChanged', this._wallMaterialChanged );
				
			//
			
			const shapePanel = this._getPanel( EDIT_MODE_SHAPE );
			const shapeControls = shapePanel.querySelector( '.shape-controls' );
			const wallsPanel = this._getPanel( EDIT_MODE_WALLS );
			const deckingPanel = this._getPanel( EDIT_MODE_DECKING );

			shapeControls.innerHTML = '';
			wallsPanel.innerHTML = '';
			deckingPanel.innerHTML = '';
			
			this._clearSupportsPanel();

			
			// ----------------------------------------------------------------------------------------------------
			// SHAPE
			// ----------------------------------------------------------------------------------------------------

				this._selectShapeListItem( shape.getType() );
				
				shape.getInputableNames().forEach( name =>
				{
					const group = document.createElement( 'div' );	 
					const label = document.createElement( 'span' );
					const input = document.createElement( 'input' );

					label.textContent = name + '';

					input.dataset.name = name;
					input.type = 'number';
					input.step = 10; // 1cm = 10mm
					input.min = shape.getMinLineLength( name );
					input.max = shape.getMaxLineLength( name );
					input.value = shape.getLineLength( name );
					
					input.onpointerdown = () => 
					{
						if( document.activeElement !== input )
						{
							// console.log( 'focus' );
							input.focus();
						}
					};

					input.onchange = () => shape.setLineLength( name, input.valueAsNumber );
					input.onfocus = () => this.dispatchEvent( { type:'focus', inputType:'line', name:input.dataset.name } );
					input.onblur = () => this.dispatchEvent( { type:'blur', inputType:'line' } );
					
					group.classList.add( 'row' );
					group.append( label, input );
					
					shapeControls.append( group );
				} );
				
				let buttonContainerElement;

				if( shape.canFlipX() || shape.canFlipY() || shape.canRotate() )
				{
					buttonContainerElement = document.createElement( 'div' );
					buttonContainerElement.classList.add( 'row' );
					
					shapeControls.append( document.createElement( 'hr' ), buttonContainerElement );
				}
				
				if( shape.canFlipX() )
				{
					const flipXButton = document.createElement( 'button' );
					
					flipXButton.classList.add( 'white' );
					flipXButton.textContent = Dictionary.get( 'flip_x' );
					flipXButton.onclick = () => shape.flipX();
					
					buttonContainerElement.append( flipXButton ); 
				}
				
				if( shape.canFlipY() )
				{
					const flipYButton = document.createElement( 'button' );
					
					flipYButton.classList.add( 'white' );
					flipYButton.textContent = 'Flip Y';
					flipYButton.onclick = () => shape.flipY();
					
					buttonContainerElement.append( flipYButton );
				}
				
				if( shape.canRotate() )
				{
					const rotateButton = document.createElement( 'button' );
					
					rotateButton.classList.add( 'white' );
					rotateButton.textContent = Dictionary.get( 'rotate' );
					rotateButton.onclick = () => shape.rotate();
					
					buttonContainerElement.append( rotateButton );
				}
				
			// ----------------------------------------------------------------------------------------------------
			// WALLS
			// ----------------------------------------------------------------------------------------------------
				
				const wallMaterialSelect = document.createElement( 'select' );
				const wallGroup = document.createElement( 'div' );
				
				
				[
					{ value:WALL_MATERIAL_BRICK, name:Dictionary.get( 'brick' ) },
					{ value:WALL_MATERIAL_RUBBLE, name:Dictionary.get( 'rubble' ) },
					{ value:WALL_MATERIAL_CONCRETE, name:Dictionary.get( 'concrete' ) },
					{ value:WALL_MATERIAL_OTHER, name:Dictionary.get( 'other' ) },
					
				].forEach( data =>
				{
					const { name, value } = data;
					const option = document.createElement( 'option' );
					
					option.textContent = name;
					option.value = value;
					
					wallMaterialSelect.append( option );
				} );
				
				wallMaterialSelect.classList.add( 'wall-material' );
				wallMaterialSelect.onchange = () => shape.setWallMaterial( wallMaterialSelect.selectedOptions[ 0 ].value );

				//
				
				shape.getLines().forEach( line =>
				{
					const { name, hasWall } = line;	
					const group = document.createElement( 'div' );	
					const label = document.createElement( 'span' );
					const checkbox = document.createElement( 'input' );

					label.textContent = name + '';
					
					checkbox.dataset.name = name;
					checkbox.type = 'checkbox';
					checkbox.checked = hasWall;
					checkbox.onchange = () => shape.setLineWalled( name, checkbox.checked );
					
					group.classList.add( 'row' );
					group.append( label, checkbox );
					
					wallGroup.append( group );					
				} );
				
				wallGroup.classList.add( 'walls' );
				
				//
				
				wallsPanel.append( wallMaterialSelect, document.createElement( 'hr' ), wallGroup );
			
			// ----------------------------------------------------------------------------------------------------
			// DECKING
			// ----------------------------------------------------------------------------------------------------
				
				const deckingGroup = document.createElement( 'div' );
				const orientationSelect = document.createElement( 'select' );	
				const orientationList = shape.getDeckingOrientationList();
				const boardWidthSelect = document.createElement( 'select' );	
				
				[ 
					{ name:Dictionary.get( 'horizontal' ), value:DECKING_ORIENTATION_HORIZONTAL }, 
					{ name:Dictionary.get( 'vertical' ), value:DECKING_ORIENTATION_VERTICAL },
					
				].forEach( ( orientation, index ) =>
				{
					const { name, value } = orientation;
					const option = document.createElement( 'option' );
					
					option.value = value;
					option.textContent = name;
					option.hidden = 
					option.disabled = !orientationList.includes( value );
					
					orientationSelect.append( option );
					
					if( shape.getDeckingOrientation() == value )
						orientationSelect.selectedIndex = index;
				} );
				
				orientationSelect.onchange = () => shape.setDeckingOrientation( orientationSelect.selectedOptions[ 0 ].value );

				//
				
				[ DECKING_BOARD_WIDTH_140, DECKING_BOARD_WIDTH_200 ].forEach( ( value, index ) =>
				{
					const option = document.createElement( 'option' );
					
					option.value =
					option.textContent = value;
					
					boardWidthSelect.append( option );
					
					if( shape.getDeckingBoardWidth() == value )
						boardWidthSelect.selectedIndex = index;
				} );
				
				boardWidthSelect.onchange = () => shape.setDeckingBoardWidth( parseInt( boardWidthSelect.selectedOptions[ 0 ].textContent ) );
				
				deckingGroup.classList.add( 'row' );
				deckingGroup.classList.add( 'decking-row' );
				deckingGroup.append( document.createTextNode( Dictionary.get( 'orientation' ) ), orientationSelect, boardWidthSelect );
				
				//
				
				const bottomDeckingCheckboxGroup = document.createElement( 'div' );
				const bottomDeckingCheckbox = document.createElement( 'input' );
				const bottomDeckingLabel = document.createElement( 'label' );
				
				bottomDeckingCheckbox.type = 'checkbox';
				bottomDeckingCheckbox.id = 'bottom-decking-checkbox';
				bottomDeckingCheckbox.checked = shape.getBottomDeckingEnabled();
				bottomDeckingCheckbox.onclick = () => shape.setBottomDeckingEnabled( bottomDeckingCheckbox.checked );
				
				bottomDeckingLabel.setAttribute( 'for', 'bottom-decking-checkbox' );
				bottomDeckingLabel.innerHTML = Dictionary.get( 'bottom_decking' );
				
				bottomDeckingCheckboxGroup.classList.add( 'checkbox' );
				bottomDeckingCheckboxGroup.classList.add( 'bottom-decking-checkbox' );
				bottomDeckingCheckboxGroup.append( bottomDeckingCheckbox, bottomDeckingLabel );

				//
				
				deckingPanel.append( this.deckingColorList, document.createElement( 'hr' ), deckingGroup, bottomDeckingCheckboxGroup );
			
			// ----------------------------------------------------------------------------------------------------
			// SUPPORTS
			// ----------------------------------------------------------------------------------------------------
			
			if( this._editMode == EDIT_MODE_SUPPORTS )
			{
				this._fillSupportsPanel();
			}
			
			// ----------------------------------------------------------------------------------------------------

			this._updateDeckingColorList();
			this._updatePanels();			
		}
	}
}

export { BalconyMenu };  