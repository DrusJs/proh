import { EventDispatcher } from 'three';
import { Dictionary } from '../Dictionary.js';
import { Shape } from '../Shape.js';
import { EDIT_MODE_RAILING } from '../Constants.js';

class RailinglMenu extends EventDispatcher
{
	constructor() 
	{
		super();

		this._editMode = null;
		this._shape = null;
		
		this._element = document.createElement( 'div' ); 
		this._accordions = [];

		this._createAccordion( 'Railing',  EDIT_MODE_RAILING );
		
		//
		
		const panel = this._getPanel( EDIT_MODE_RAILING );

		const typeGroup = document.createElement( 'div' );
		const typeLabel = document.createElement( 'span' );
		const typeSelect = document.createElement( 'select' );
		
		typeGroup.classList.add( 'row' );
		
		typeLabel.textContent = 'Modèle';

		
		[ 'Roundline', 'Flatline', 'Oceanline' ].forEach( name =>
		{
			const option = document.createElement( 'option' );
			
			option.textContent = name;
			
			typeSelect.append( option );
		} );
		
		typeGroup.append( typeLabel, typeSelect );
		
		panel.append( typeGroup );
		
		//
		
		const colorGroup = document.createElement( 'div' );
		const colorLabel = document.createElement( 'span' );
		const colorSelect = document.createElement( 'select' );
		
		colorGroup.classList.add( 'row' );
		
		colorLabel.textContent = 'Couleur';
		
		[ 'DB703', 'RAL 7013', 'RAL 7016', 'RAL 8019', 'RAL 9001', 'RAL 9005', 'RAL 9007', 'RAL 9016' ].forEach( name =>
		{
			const option = document.createElement( 'option' );
			
			option.textContent = name;
			
			colorSelect.append( option );
		} );
		
		colorGroup.append( colorLabel, colorSelect );
		
		panel.append( colorGroup );
		
		//
		
		const crossbarGroup = document.createElement( 'div' );
		const crossbarLabel = document.createElement( 'span' );
		const crossbarSelect = document.createElement( 'select' );
		
		crossbarGroup.classList.add( 'row' );
		
		crossbarLabel.textContent = 'Nombre de tiges';
		
		[ '2', '3', '4', '5' ].forEach( name =>
		{
			const option = document.createElement( 'option' );
			
			option.textContent = name;
			
			crossbarSelect.append( option );
		} );
		
		crossbarGroup.append(crossbarLabel, crossbarSelect );
		
		panel.append( crossbarGroup );
		
		//
		
		const jonctionGroup = document.createElement( 'div' );
		const jonctionLabel = document.createElement( 'span' );
		const jonctionSelect = document.createElement( 'select' );
		
		jonctionGroup.classList.add( 'row' );
		
		jonctionLabel.textContent = 'Jonction';
		
		[ 'droit', 'arrondie' ].forEach( name =>
		{
			const option = document.createElement( 'option' );
			
			option.textContent = name;
			
			jonctionSelect.append( option );
		} );
		
		jonctionGroup.append(jonctionLabel, jonctionSelect );
		
		panel.append( jonctionGroup );
		
		//

		this._setEditMode( EDIT_MODE_RAILING );		
	}

	
	_createAccordion( name, editMode )
	{
		const accordion = document.createElement( 'button' );
		
		accordion.classList.add( 'accordion' );
		accordion.dataset.mode = editMode;
		accordion.textContent = name;
		accordion.onclick = () => this._setEditMode( accordion.dataset.mode );
		
		const panel = document.createElement( 'div' );
		
		panel.classList.add( 'panel' );
		
		this._element.append( accordion, panel );
		
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
	_setEditMode = ( mode ) =>
	{
		if( this._editMode !== mode )
		{
			this._editMode = mode;
			
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

	
	getElement = () => this._element;
	
	update()
	{
		this._updatePanels();
	}

	setShape( shape )
	{
		if( this._shape != shape )
		{
			// this._shape?.removeEventListener( 'change', this._change );
			
			this._shape = shape;
			// this._shape.addEventListener( 'change', this._change ); 

			
			this._updatePanels();			
		}
	}
}

export { RailinglMenu };  