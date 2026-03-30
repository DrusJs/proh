import { EventDispatcher } from 'three';
import { Dictionary } from '../Dictionary.js';
import { VIEW_MODE_2D, VIEW_MODE_3D } from '../Constants.js';
	
class ViewModeControls extends EventDispatcher
{
	constructor() 
	{
		super();

		//

		this._viewModeSelectElement = document.createElement( 'select' );
		this._viewModeSelectElement.onchange = () => 
		{
			arButtonElement.classList[ this.getMode() == VIEW_MODE_3D ? 'remove' : 'add' ]( 'hidden' );
			
			this.dispatchEvent( { type:'change' } );
		};
		
		[ { name:'2D', mode:VIEW_MODE_2D }, { name:'3D', mode:VIEW_MODE_3D } ].forEach( ( data, index ) =>
		{
			const { mode, name } = data;
			const option = document.createElement( 'option' );
			
			option.textContent = name;
			option.value = mode;
			
			this._viewModeSelectElement.appendChild( option );
		} );
		
		//
		
		const viewModeLabel = document.createElement( 'label' );
		
		viewModeLabel.textContent = Dictionary.get( 'view_mode' ) + ' ';

		//
		
		const arButtonElement = document.createElement( 'button' );
		
		arButtonElement.classList[ this.getMode() == VIEW_MODE_3D ? 'remove' : 'add' ]( 'hidden' );
		arButtonElement.classList.add( 'white' );
		arButtonElement.textContent = Dictionary.get( 'generate_ar_view' );
		arButtonElement.onclick = () => this.dispatchEvent( { type:'ar' } );
		
		//
		
		this._element = document.createElement( 'div' );
		this._element.classList.add( 'row-center' );
		this._element.append( viewModeLabel, this._viewModeSelectElement, arButtonElement );
	}
	
	getMode = () => this._viewModeSelectElement.selectedOptions[ 0 ].value;

	getElement = () => this._element;
}

export { ViewModeControls };  