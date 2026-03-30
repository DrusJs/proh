import { EventDispatcher } from 'three';
import { Dictionary } from '../Dictionary.js';

class TopMenu extends EventDispatcher
{
	constructor( isEditable ) 
	{
		super();
		
		this._tabElements = [];
		this._selectedTabIndex = -1;
		this._element = document.createElement( 'div' );
		this._element.classList.add( 'container' );

		const shapeButtonElement = document.createElement( 'button' );
		const guardrailButtonElement = document.createElement( 'button' );
		const stairsButtonElement = document.createElement( 'button' );
		
		shapeButtonElement.textContent = 'Balcony';
		guardrailButtonElement.textContent = 'Guardrail';
		stairsButtonElement.textContent = 'Stairs';
		
		stairsButtonElement.classList.add( 'disabled' );
		
		const tabContainerElement = document.createElement( 'div' );
		
		tabContainerElement.classList.add( 'tabs-container' );
		tabContainerElement.append( shapeButtonElement, guardrailButtonElement, stairsButtonElement );
		
		this._tabElements.push( shapeButtonElement, guardrailButtonElement, stairsButtonElement );	
		this._tabElements.forEach( ( element, index ) => 
		{
			element.onclick = () => this.setSelectedTabIndex( index ); 
		} );
		
		this._element.append( tabContainerElement );
		
		//
		
		const buttonContainerElement = document.createElement( 'div' );
		
		buttonContainerElement.classList.add( 'buttons-container' );
		
		/*
		const exportButtonElement = document.createElement( 'button' );
		const importButtonElement = document.createElement( 'button' );
		
		exportButtonElement.textContent = 'Export';
		exportButtonElement.onclick = () => this.dispatchEvent( { type:'export' } );
		
		importButtonElement.textContent = 'Import';
		importButtonElement.onclick = () => this.dispatchEvent( { type:'import' } );
		
		buttonContainerElement.append( exportButtonElement, importButtonElement );
		*/

		const backButtonElement = document.createElement( 'button' );

		backButtonElement.classList.add( 'white' );
		//backButtonElement.textContent = Dictionary.get( 'back' );
		backButtonElement.innerHTML = '<svg width="10" height="18" viewBox="0 0 10 18" xmlns="http://www.w3.org/2000/svg">' +
			'<path d="M0.263079 9.64238L8.3576 17.7342C8.71278 18.0885 9.28823 18.0885 9.64431 17.7342C9.99949 17.3799 9.99949 16.8045 9.64431 16.4502L2.19184 9.00041L9.64341 1.55063C9.99859 1.19635 9.99859 0.620896 9.64341 0.265714C9.28823 -0.0885713 8.71188 -0.0885713 8.3567 0.265714L0.262182 8.35747C-0.0875435 8.70809 -0.0875434 9.29258 0.263079 9.64238Z"></path>' +
		'</svg><span>' + Dictionary.get( 'back' ) + '</span>';
		
		backButtonElement.onclick = () => this.dispatchEvent( { type:'back' } );

		buttonContainerElement.append( backButtonElement );
		
		if( isEditable )
		{
			const saveButtonElement = document.createElement( 'button' );
			
			saveButtonElement.classList.add( 'black' );
			saveButtonElement.innerHTML = Dictionary.get( 'save' );
			saveButtonElement.onclick = () => this.dispatchEvent( { type:'save' } );

			
			buttonContainerElement.append( saveButtonElement );
		}
		
		this._element.append( buttonContainerElement );
	}
	
	
	getSelectedTabIndex = () => this._selectedTabIndex;
	setSelectedTabIndex = ( value ) =>
	{
		if( Number.isFinite( value ) )
		{
			value = Math.min( this._tabElements.length - 1, Math.max( 0, value ) );
			
			if( this._selectedTabIndex !== value )
			{			
				this._selectedTabIndex = value;
				this._tabElements.forEach( ( element, index ) => element.classList[ index === value ? 'add' : 'remove' ]( 'active' ) );
				this.dispatchEvent( { type:'tabSelect' } );
			}
		}
	};
	
	getElement = () => this._element;
}

export { TopMenu };  