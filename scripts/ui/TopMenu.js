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
			saveButtonElement.classList.add( 'save-icon' );
			//saveButtonElement.innerHTML = Dictionary.get( 'save' );
			saveButtonElement.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">' +
				'<g clip-path="url(#clip0_2_493)"><path d="M17.2744 4.10063L13.8994 0.725634C13.8468 0.673501 13.7845 0.632256 13.7159 0.604263C13.6474 0.57627 13.574 0.562081 13.5 0.562509H12.375V5.06251C12.375 5.36088 12.2565 5.64703 12.0455 5.858C11.8345 6.06898 11.5484 6.18751 11.25 6.18751H6.75C6.45163 6.18751 6.16548 6.06898 5.9545 5.858C5.74353 5.64703 5.625 5.36088 5.625 5.06251V0.562509H2.25C1.80245 0.562509 1.37322 0.740299 1.05676 1.05677C0.74029 1.37323 0.5625 1.80246 0.5625 2.25001V15.75C0.5625 16.1976 0.74029 16.6268 1.05676 16.9433C1.37322 17.2597 1.80245 17.4375 2.25 17.4375H3.375V12.375C3.375 11.9275 3.55279 11.4982 3.86926 11.1818C4.18572 10.8653 4.61495 10.6875 5.0625 10.6875H12.9375C13.3851 10.6875 13.8143 10.8653 14.1307 11.1818C14.4472 11.4982 14.625 11.9275 14.625 12.375V17.4375H15.75C16.1976 17.4375 16.6268 17.2597 16.9432 16.9433C17.2597 16.6268 17.4375 16.1976 17.4375 15.75V4.50001C17.4379 4.42598 17.4237 4.3526 17.3957 4.28406C17.3678 4.21553 17.3265 4.15319 17.2744 4.10063Z" fill="white"/><path d="M6.75 0.5625H11.25V5.0625H6.75V0.5625ZM12.9375 11.8125H5.0625C4.91332 11.8125 4.77024 11.8718 4.66475 11.9773C4.55926 12.0827 4.5 12.2258 4.5 12.375V17.4375H13.5V12.375C13.5 12.2258 13.4407 12.0827 13.3352 11.9773C13.2298 11.8718 13.0867 11.8125 12.9375 11.8125Z" fill="white"/></g>' +
				'<defs><clipPath id="clip0_2_493"><rect width="18" height="18" fill="white"/></clipPath></defs>' +
			'</svg><span>' + Dictionary.get( 'save' ) + '</span>';
			
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