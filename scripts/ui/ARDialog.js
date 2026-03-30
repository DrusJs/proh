import { EventDispatcher } from 'three';
import { Dictionary } from '../Dictionary.js';
import { qrcode } from '../libs/qrcode.js';

class ARDialog extends EventDispatcher
{
	constructor( view3d ) 
	{
		super();
		
		/*const qr = qrcode( 0, 'L' );
		const url = window.location.href; // window.location.protocol + '//' + window.location.host + window.location.pathname;
		
		qr.addData( url );
		qr.make();
		
		console.log( url );*/
		
		this._disposed = false;
		this._version = view3d.getVersion();
		this._element = document.createElement( 'div' );
		
		const containerElement = document.createElement( 'div' );
		const qrContainerElement = document.createElement( 'div' );

		containerElement.classList.add( 'dialog' );
		containerElement.onpointerdown = ( event ) => event.stopPropagation(); 
		containerElement.append( qrContainerElement );
		
		this._element.classList.add( 'dialog-backdrop' );
		this._element.append( containerElement );
		this._element.onpointerdown = () => this._element.remove();
		
		view3d.toGLB().then( buffer =>
		{
			// TEST_BEING
			/*
			const link = document.createElement( 'a' );
			
			link.href = URL.createObjectURL( new Blob( [ buffer ], { type:'application/octet-stream' } ) );
			link.download = 'scene.glb';
			link.click();
			*/
			// TEST_END
			
			if( !this._disposed )
			{		
				const body = new FormData();

				body.append( 'data', new Blob( [ buffer ], { type:'application/octet-stream' } ), 'scene.glb' );

				fetch( '../get_data.php', { method:'POST', headers:{}, body } )
				.then( response => response.json() )
				.then( json => 
				{
					const qr = qrcode( 0, 'L' );

					qr.addData( json.result_file );
					qr.make();
					
					qrContainerElement.innerHTML = qr.createSvgTag( { cellSize:4, margin:8, scalable:true } );
					
					const linkElement = document.createElement( 'a' );
				
					linkElement.textContent = Dictionary.get( 'copy_ar_view_link' );
					linkElement.href = json.result_file;
					linkElement.onclick = ( event ) =>
					{
						event.preventDefault();
						
						navigator.clipboard.writeText( json.result_file )
						.then( () => console.log( 'copied' ) )
						.catch( error => console.error( error ) );
					}
					
					containerElement.append( linkElement );
				} )
				.catch( error => 
				{
					console.error( error );	
					
					this._version = -1;					
				} );
			}
			
		} )
		.catch( error => console.warn( error ) );	
	}
	
	getElement = () => this._element;

	getVersion = () => this._version;
	
	dispose = () =>
	{
		this._disposed = true;
		this._element.querySelectorAll( 'a' ).forEach( element => URL.revokeObjectURL( element.href ) ) ;
	}
}

export { ARDialog };  