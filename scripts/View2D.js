import { EventDispatcher, Vector2, Box2 } from 'three';
import 
{ 
	TOP_BORDER_THICKNESS, 
	SUPPORT_RADIUS, SUPPORT_TYPE_WALL_MOUNT,
	DECKING_ORIENTATION_VERTICAL, DECKING_ORIENTATION_HORIZONTAL 
} from './Shape.js';
import { EDIT_MODE_SHAPE, EDIT_MODE_WALLS, EDIT_MODE_DECKING, EDIT_MODE_SUPPORTS } from './Constants.js';

const DEFAULT_ZOOM = 0.2;
const NORMAL_SIZE = 100;

class View2D extends EventDispatcher
{
	constructor() 
	{
		super();
		
		this._onChange = ( event ) => this.onChange( event );
		this._onPointerDown = ( event ) => this.onPointerDown( event );
		this._onPointerCancel = ( event ) => this.onPointerCancel( event );
		this._onPointerMove = ( event ) => this.onPointerMove( event );
		this._onMouseWheel = ( event ) => this.onMouseWheel( event );

		this._editMode = null;
		this._requestId = null;
		this._active = false;
		this._needsRender = true;
		this._shape = null;
		this.dragData = null;
		this.hoveredLineName = null;
		this.hoveredSupportUUID = null;
		this.highlightedLineName = null;
		this.highlightedDistanceUUID = null;
		this.pointer = new Vector2();
		this.action = null;
		this.pan = new Vector2();
		this.zoomSpeed = 1.0;
		this.zoom = DEFAULT_ZOOM;
		this.width = 0;
		this.height = 0;
		this._canvas = document.createElement( 'canvas' );
		this._canvas.style.cursor = 'grab';
		this._canvas.addEventListener( 'contextmenu', ( event ) => event.preventDefault() );
		this._canvas.addEventListener( 'pointerdown', this._onPointerDown );
		this._canvas.addEventListener( 'pointerup', this._onPointerCancel );
		this._canvas.addEventListener( 'pointercancel', this._onPointerCancel );
		this._canvas.addEventListener( 'pointermove', this._onPointerMove );
		this._canvas.addEventListener( 'wheel', this._onMouseWheel, { passive:false } );
		
		window.addEventListener( 'blur', this._onPointerCancel );

		this.render();
	}
	
	getElement = () => this._canvas;
	
	setActive( value )
	{
		value = !!value;
		
		if( this._active !== value )
		{
			this._active = value;
			
			if( this._active )
			{
				if( this._requestId == null )
				{
					this.render();
					this._needsRender = true;
				}
			}
			else 
			{
				if( this._requestId != null )
				{
					cancelAnimationFrame( this._requestId );
					this._requestId = null;
					
					this.onPointerCancel();
				}
			}
		}
	}
	
	fitToScreen()
	{
		const box = this._shape.getOuterBox();
		const size = box.getSize( new Vector2() );
		const padding = 100;
		const zoom = Math.min( ( this.width - padding * 2 ) / size.x, ( this.height - padding * 2 ) / size.y );

		this.zoom = Math.min( DEFAULT_ZOOM, Number.parseFloat( zoom.toFixed( 4 ) ) );
		this.pan.set( 0, 0 ); // box.getCenter ???
		
		console.log( this.width - padding * 2, size.x, this.zoom );

		this._needsRender = true;
	}
	
	dollyIn( zoomScale = 0.95 )
	{
		this.zoom *= zoomScale;

		this._needsRender = true;
	}
	
	dollyOut( zoomScale = 0.95 )
	{	
		this.zoom /= zoomScale;

		this._needsRender = true;
	}
	
	onMouseWheel( event )
	{
		event.preventDefault();
		
		if( this.action != null )
		{
			return;
		}

		const zoomScale = Math.pow( 0.95, this.zoomSpeed * Math.abs( event.deltaY * 0.01 ) );

		const { x, y } = this._canvas.getBoundingClientRect();	
		const pointer = new Vector2( event.clientX - x, event.clientY - y )
		
		const center = new Vector2( this.width / 2, this.height / 2 ).addScaledVector( this.pan, this.zoom );
		const localPointer = new Vector2().subVectors( pointer, center ).multiplyScalar( 1 / this.zoom );

		if( event.deltaY > 0 ) 
		{
			this.dollyIn( zoomScale );
		} 
		else if( event.deltaY < 0 ) 
		{
			this.dollyOut( zoomScale );
		}

		const center2 = new Vector2( this.width / 2, this.height / 2 ).addScaledVector( this.pan, this.zoom );
		const localPointer2 = new Vector2().subVectors( pointer, center2 ).multiplyScalar( 1 / this.zoom );

		this.pan.add( new Vector2().subVectors( localPointer2, localPointer ) );
	}
	
	onPointerDown( event )
	{
		if( this._shape == null )
		{
			return;
		}
		
		if( !event.isPrimary || ( event.pointerType === 'mouse' && event.button !== 0 ) ) 
		{
			return;
		}
		
		this._canvas.setPointerCapture( event.pointerId );
		this._canvas.style.cursor = 'grabbing'; 
		
		this.pointer.set( event.clientX, event.clientY );
		
		if( this.hoveredSupportUUID != null )
		{
			this.action = 'dragSupport';
			this.dragData = this._shape.getSupport( this.hoveredSupportUUID );
			this.dragData.pointer = this.pointer.clone();
			
			this._needsRender = true;
		}
		else if( this.hoveredLineName != null )
		{
			this.action = 'dragLine';
			this.dragData = this._shape.getLine( this.hoveredLineName );
			this.dragData.pointer = this.pointer.clone();
		}
		else 
		{
			this.action = 'pan';	
		}	
	}
	
	onPointerMove( event )
	{
		if( this._shape == null )
		{
			return;
		}
		
		if( this.action == 'pan' )
		{	
			const pointer = new Vector2( event.clientX, event.clientY );
			const translation = new Vector2().subVectors( pointer, this.pointer ).multiplyScalar( 1 / this.zoom );

			this.pointer.copy( pointer );
		
			this.pan.add( translation ); 
			
			this._needsRender = true;
		}
		else if( this.action == 'dragLine' )
		{
			const data = this.dragData;
			const pointer = new Vector2( event.clientX, event.clientY );
			const axis = Math.abs( data.normal.x ) > Math.abs ( data.normal.y ) ? 'x' : 'y';
			const movement = new Vector2().subVectors( pointer, data.pointer ).multiplyScalar( 1 / this.zoom ).round();
			const startPosition = data.start.position.clone();
			const endPosition = data.end.position.clone();
			
			if( event.ctrlKey )
			{
				movement.multiplyScalar( 0.1 ).round().multiplyScalar( 10 );
			}

			startPosition[ axis ] += movement[ axis ];
			endPosition[ axis ] += movement[ axis ];

			this._shape.setLinePosition( data.name, startPosition, endPosition );	
			this._needsRender = true;
		}
		else if( this.action == 'dragSupport' )
		{
			const data = this.dragData;
			const pointer = new Vector2( event.clientX, event.clientY );
			const movement = new Vector2().subVectors( pointer, data.pointer ).multiplyScalar( 1 / this.zoom ).round();
			
			movement[ data.axis === 'x' ? 'y' : 'x' ] = 0;

			this._shape.setSupportPosition( data.uuid, data.position.clone().add( movement ) );
			this._needsRender = true;
		}
		else if( this._editMode === EDIT_MODE_SHAPE )
		{	
			const { x, y } = this._canvas.getBoundingClientRect();	
			const pointer = new Vector2( event.clientX - x, event.clientY - y );
			const center = new Vector2( this.width / 2, this.height / 2 ).addScaledVector( this.pan, this.zoom );
			const localPointer = new Vector2().subVectors( pointer, center ).multiplyScalar ( 1 / this.zoom ); // localPointer	
			const lineName = this._shape.getLineNameNearestToPoint( localPointer, 10 / this.zoom );
			
			if( lineName )
			{
				this.hoveredLineName = lineName;
				this._needsRender = true;
			}
			else 
			{
				if( this.hoveredLineName != null )
				{
					this.hoveredLineName = null;
					this._needsRender = true;
				}
			}
		}
		else if( this._editMode == EDIT_MODE_SUPPORTS )
		{
			const { x, y } = this._canvas.getBoundingClientRect();	
			const pointer = new Vector2( event.clientX - x, event.clientY - y );
			const center = new Vector2( this.width / 2, this.height / 2 ).addScaledVector( this.pan, this.zoom );
			const localPointer = new Vector2().subVectors( pointer, center ).multiplyScalar ( 1 / this.zoom ); // localPointer
			const uuid = this._shape.getSupportUUIDNearestToPoint( localPointer );

			if( uuid && this._shape.getSupport( uuid ).isMovable )
			{
				this.hoveredSupportUUID = uuid;
				this._needsRender = true;
			}
			else 
			{
				if( this.hoveredSupportUUID != null )
				{
					this.hoveredSupportUUID = null;
					this._needsRender = true;
				}
			}
		}
	}
	
	onPointerCancel( event )
	{
		if( this._shape == null )
		{
			return;
		}
		
		if( event == null || event.type == 'blur' || event.isPrimary )
		{
			const action = this.action;
			
			this._canvas.style.cursor = 'grab';
			
			this.dragData = null;
			this.hoveredLineName = null;
			this.hoveredSupportUUID = null;
			this.action = null;
			
			this._needsRender = true;
			
			if( action == 'dragLine' )
			{
				this._shape.center();
			}
			
			if( event && event.isPrimary )
			{
				this.onPointerMove( event );
			}
		}
	}
	
	onChange( event )
	{
		const { hasError } = event;
		
		// console.log( event );
		
		if( hasError !== true )
		{
			this._needsRender = true;
		}
	}	
	
	getEditMode()
	{
		return this._editMode;
	}
	
	setEditMode( mode )
	{
		console.log( 'setEditMode', mode );
		
		if( this._editMode != mode )
		{
			this._editMode = mode;
			this._needsRender = true;
			
			this.hoveredLineName = null;
			this.hoveredSupportUUID = null;
			this.action = null;
		}
	}
	
	getShape()
	{
		return this._shape;
	}
	
	setShape( shape )
	{
		if( this._shape != shape )
		{
			this._shape?.removeEventListener( 'change', this._onChange );
			this._shape?.removeEventListener( 'deckingRecomputed', this._onChange );
			this._shape?.removeEventListener( 'deckingColorChanged', this._onChange );
			this._shape?.removeEventListener( 'supportTypeChanged', this._onChange );
			this._shape?.removeEventListener( 'supportPositionChanged', this._onChange );
			this._shape?.removeEventListener( 'wallAdded', this._onChange );
			this._shape?.removeEventListener( 'wallRemoved', this._onChange );
			
			this.zoom = DEFAULT_ZOOM;
			this.pan.set( 0, 0 );
			this.highlightedLineName = null;
			
			this._shape = shape;
			this._shape?.addEventListener( 'change', this._onChange ); 
			this._shape?.addEventListener( 'deckingRecomputed', this._onChange );
			this._shape?.addEventListener( 'deckingColorChanged', this._onChange );
			this._shape?.addEventListener( 'supportTypeChanged', this._onChange );
			this._shape?.addEventListener( 'supportPositionChanged', this._onChange );
			this._shape?.addEventListener( 'wallAdded', this._onChange );
			this._shape?.addEventListener( 'wallRemoved', this._onChange );
			
			// this.fitToScreen();

			this._needsRender = true;
		}
	}
	
	setHighlightedLine( name )
	{ 
		if( this._shape != null && this.highlightedLineName != name ) 
		{
			this.highlightedLineName = name;
			
			this._needsRender = true;
		}
	}
	
	setHighlightedDistance( uuid )
	{ 
		if( this._shape != null && this.highlightedDistanceUUID != uuid ) 
		{
			this.highlightedDistanceUUID = uuid;
			
			this._needsRender = true;
		}
	}

	draw()
	{
		const timestamp = performance.now();
		
		const shape = this._shape;
		const zoom = this.zoom;
		const canvas = this._canvas;
		const context = canvas.getContext( '2d' );
		const width = this.width;
		const height = this.height;

		context.fillStyle = '#FFFFFF';
		context.fillRect( 0, 0, width, height );
		
		if( this._shape == null )
		{
			return;
		}
		
		const center = new Vector2( width / 2, height / 2 ).addScaledVector( this.pan, zoom );

		const drawText = ( text, x, y, rotation, shadowBlur = 0, shadowColor = '#000000' ) =>
		{		
			context.shadowColor = shadowColor;
			context.shadowBlur = shadowBlur;
			context.translate( x, y );
			context.rotate( Math.PI / 180 * rotation );
			context.fillText( text, 0, 0 );
			context.resetTransform();
			context.shadowBlur = 0;
		};
		
		if( shape )
		{	
			const orientation = shape.getDeckingOrientation();
			const lines = shape.getLines();
			const outerPoints = shape.getOuterPoints();
			const topInnerPoints = shape.getTopInnerPoints();
			const bottomInnerPoints = shape.getBottomInnerPoints();
			const beams = shape.getBeams();
			const drawBottom = [ EDIT_MODE_SHAPE, EDIT_MODE_SUPPORTS ].includes( this._editMode );
			
			const { x:cx, y:cy } = center;
			
			
			
			// WALLS_BEGIN
			
				shape.getWalls().forEach( ( wall, index ) =>
				{
					const { front, back } = wall;
					
					front.start.multiplyScalar( zoom ).add( center );
					front.end.multiplyScalar( zoom ).add( center );
					back.start.multiplyScalar( zoom ).add( center );
					back.end.multiplyScalar( zoom ).add( center );
					
					context.fillStyle = this._editMode === EDIT_MODE_WALLS ? '#FF6600' : '#DDDDDD';
					context.beginPath();
					context.moveTo( front.start.x, front.start.y );
					context.lineTo( back.start.x, back.start.y );
					context.lineTo( back.end.x, back.end.y );
					context.lineTo( front.end.x, front.end.y );
					context.lineTo( front.start.x, front.start.y );
					context.fill();
				} );

			// WALLS_END


			// DECKING_BEGIN
			
				
				
				context.fillStyle = this._editMode == EDIT_MODE_DECKING ? '#999999' : '#EFEFEF';
				context.beginPath();
				
				outerPoints.forEach( ( point, index ) =>
				{
					const { x, y } = point.position;
					
					if( index === 0 ) context.moveTo( x * zoom + cx, y * zoom + cy );		
					else context.lineTo( x * zoom + cx, y * zoom + cy );
				} );
				
				context.fill();
				
				context.fillStyle = ( this._editMode == EDIT_MODE_DECKING ? '#000000' : ( drawBottom ? '#FFFFFF' : '#999999' ) );
				context.beginPath();
				
				( drawBottom ? bottomInnerPoints : topInnerPoints ).forEach( ( point, index ) =>
				{
					const { x, y } = point.position;
					
					if( index === 0 ) context.moveTo( x * zoom + cx, y * zoom + cy );		
					else context.lineTo( x * zoom + cx, y * zoom + cy );
				} );
				
				context.fill();
				
				
				
				if( !drawBottom )
				{
					const deckingBoards = this._shape.getDeckingBoards();
					
					deckingBoards.forEach( board =>
					{
						context.beginPath();
						
						/*if( [ EDIT_MODE_SHAPE, EDIT_MODE_DECKING ].includes( this._editMode ) && board.hasError )
						{
							context.fillStyle = this._editMode == EDIT_MODE_DECKING ? '#FF3DB5' : '#FFBBDD';
						}
						else
						{ */
							context.fillStyle = this._editMode == EDIT_MODE_DECKING ? this._shape.getDeckingColor() : '#FFFFFF';
						/*}*/
						
						board.shapes.forEach( shape =>
						{
							shape.forEach( ( point, index ) =>
							{
								const { x, y } = point;

								if( index == 0 )
									context.moveTo( x * zoom + cx, y * zoom + cy );		
								else 
									context.lineTo( x * zoom + cx, y * zoom + cy );
			
							} );
						} );
						
						context.fill();
						
					} );
				}

			
			// DECKING_END	
			
			// BEAMS_START
			
			if( drawBottom )
			{
				
				
				beams.forEach( beam =>
				{
					const { points, points2 } = beam;
					
					context.fillStyle = '#EFEFEF';
					context.beginPath();
					
					points.forEach( ( point, index ) =>
					{
						const { x, y } = point;

						if( index === 0 ) context.moveTo( x * zoom + cx, y * zoom + cy );		
						else context.lineTo( x * zoom + cx, y * zoom + cy );
					} );
					
					context.fill();
					
					/*context.fillStyle = '#E0E0E0';
					context.beginPath();
					
					points2.forEach( ( point, index ) =>
					{
						const { x, y } = point;

						if( index === 0 ) context.moveTo( x * zoom + cx, y * zoom + cy );		
						else context.lineTo( x * zoom + cx, y * zoom + cy );
					} );
					
					context.fill();*/
				} );
			}
			
			// BEAMS_END
			
			// SUPPORT_START
			
			const supports = shape.getSupports();

			if( drawBottom )
			{
				const radius = SUPPORT_RADIUS * zoom;
				const outline = 6;
				
				supports.forEach( support =>
				{
					const { uuid, type, hasWall, isMovable } = support;
					const { x, y } = support.position;
					
					if( this._editMode === EDIT_MODE_SUPPORTS )
					{
						const color = ( type == SUPPORT_TYPE_WALL_MOUNT ) ? '#0099FF' : ( hasWall ? '#33CC00' : '#FF6600' );
						
						if( this.action != 'dragSupport' )
						{
							context.fillStyle = color;
						}
						else 
						{
							context.fillStyle = ( this.hoveredSupportUUID === uuid ) ? color : '#DDDDDD';
						}
					}
					else 
					{
						context.fillStyle =  '#DDDDDD';	
					}
					
					context.fillRect( cx + x * zoom - radius, cy + y * zoom - radius, radius * 2, radius * 2 );
					
					if( this.action != 'dragSupport' && this.hoveredSupportUUID === uuid )
					{
						context.globalAlpha = 0.35;
						context.fillRect( cx + x * zoom - radius - outline, cy + y * zoom - radius - outline, radius * 2 + outline * 2, radius * 2 + outline * 2 );
						context.globalAlpha = 1.0;
					}
					
					if( this._editMode === EDIT_MODE_SUPPORTS && isMovable && this.action != 'dragSupport' )
					{
						context.fillStyle =  '#FFFFFF';
						context.fillRect( cx + x * zoom - radius / 2, cy + y * zoom - radius / 2, radius, radius );
					}
					
				} );
			}
			
			if( this._editMode === EDIT_MODE_SUPPORTS )
			{
				context.font = 'bold 18px sans-serif';
				context.fillStyle = '#000000';
				
				//const s = SUPPORT_RADIUS * 3 * zoom;
				
				supports.forEach( support =>
				{
					const { displayName, position, normal, edgePosition } = support;

					drawText( displayName, center.x + edgePosition.x * zoom + normal.x * 16, center.y + edgePosition.y * zoom + normal.y * 16, 0 );
				} );
				
				context.font = 'bold 14px sans-serif';
				context.textAlign = 'center';
				context.textBaseline = 'middle';
				context.fillStyle = '#999999';
					
				shape.getDistancesBetweenSupports().forEach( distance =>
				{
					const { uuid, value, axis, normal, midEdgePosition } = distance;
					
					context.fillStyle = this.highlightedDistanceUUID === uuid ? '#33CC00' : '#999999';
					drawText
					( 
						value, 
						cx + midEdgePosition.x * zoom + normal.x * 18, 
						cy + midEdgePosition.y * zoom + normal.y * 18, 
						axis === 'y' ? 90 : 0, 
						0 
					);
				} );
			}
			
			
			
			/*if( this.hoveredSupportUUID != null )
			{
				
				const { axis, normal, prev, next } = shape.getSupport( this.hoveredSupportUUID );
				
				context.font = 'bold 14px sans-serif';
				context.textAlign = 'center';
				context.textBaseline = 'middle';
				context.fillStyle = '#999999';

				drawText
				( 
					prev.distance, 
					cx + prev.midEdgePosition.x * zoom + normal.x * 18, 
					cy + prev.midEdgePosition.y * zoom + normal.y * 18, 
					Math.abs( normal.x ) > Math.abs( normal.y ) ? 90 : 0, 
					0 
				);
				
				drawText
				( 
					next.distance, 
					cx + next.midEdgePosition.x * zoom + normal.x * 18, 
					cy + next.midEdgePosition.y * zoom + normal.y * 18, 
					axis === 'y' ? 90 : 0, 
					0 
				);
			}*/
				
			// SUPPORT_END
			
			context.font = 'bold 14px sans-serif';
			context.textAlign = 'center';
			context.textBaseline = 'middle';
			context.fillStyle = '#FFFFFF';
			
			let _highlighted;
			let _hovered;
			
			const hasHilightedOrHovered = this.highlightedLineName || this.hoveredLineName;
			
			lines.forEach( line =>
			{
				const { name, start, end, normal } = line;
				const sx = center.x + start.position.x * zoom;
				const sy = center.y + start.position.y * zoom;
				const ex = center.x + end.position.x * zoom;
				const ey = center.y + end.position.y * zoom;
				const cx = sx + ( ex - sx ) / 2;
				const cy = sy + ( ey - sy ) / 2;

				if( this.highlightedLineName == line.name )
				{
					_highlighted = { sx, sy, ex, ey };
				}
				else if( this.hoveredLineName == line.name )
				{
					_hovered = { sx, sy, ex, ey };
				}
				else
				{
					context.lineWidth = !hasHilightedOrHovered && this._editMode === EDIT_MODE_SHAPE ? 2 : 1;
					context.strokeStyle = !hasHilightedOrHovered && this._editMode === EDIT_MODE_SHAPE ? '#FF6600' : '#000000';
					context.beginPath();
					context.moveTo( sx, sy );
					context.lineTo( ex, ey );
					context.stroke();
				}

				if( [ EDIT_MODE_DECKING, EDIT_MODE_SUPPORTS ].includes( this._editMode )  )
				{
					/*context.fillStyle = '#FFFFFF';
					drawText( shape.getLineLength( name ), cx - normal.x * 16, cy - normal.y * 16, Math.abs( normal.x ) > Math.abs( normal.y ) ? 90 : 0, 8 );*/
				}
				else
				{
					context.fillStyle = '#333333';
					drawText( shape.getLineLength( name ), cx + normal.x * 16, cy + normal.y * 16, Math.abs( normal.x ) > Math.abs( normal.y ) ? 90 : 0, 0 );
				}
			} );
			
			if( _highlighted )
			{
				const { sx, sy, ex, ey } = _highlighted;
				
				context.lineWidth = 4;
				context.strokeStyle = '#33CC00';
				context.beginPath();
				context.moveTo( sx, sy );
				context.lineTo( ex, ey );
				context.stroke();
			}
			
			if( _hovered )
			{
				const { sx, sy, ex, ey } = _hovered;
				
				context.lineWidth = 4;
				context.strokeStyle = '#FF6600';
				context.beginPath();
				context.moveTo( sx, sy );
				context.lineTo( ex, ey );
				context.stroke();
			}

			//
			
			if( this._editMode != EDIT_MODE_SUPPORTS )
			{
				context.font = 'bold 18px sans-serif';
				context.fillStyle = '#000000';
				
				outerPoints.forEach( point =>
				{
					const { name, position, normal } = point;

					drawText( name, center.x + position.x * zoom + normal.x * 16, center.y + position.y * zoom + normal.y * 16, 0 );	
				} );	
			}
			
			/*shape.getTraverses().forEach( shape =>
			{
				context.lineWidth = 1;
				context.strokeStyle = '#0099FF';
				context.beginPath();
					
				shape.forEach( ( point, index ) =>
				{
					const { x, y } = point;

					if( index == 0 )
						context.moveTo( x * zoom + center.x, y * zoom + center.y );		
					else 
						context.lineTo( x * zoom + center.x, y * zoom + center.y );

				} );
				
				const { x, y } = shape[ 0 ];
				
				context.lineTo( x * zoom + center.x, y * zoom + center.y );
				
				context.stroke();
			} );
			
			context.globalAlpha = 0.3;
			
			shape.getCounterTraverses().forEach( shape =>
			{
				context.lineWidth = 1;
				context.fillStyle = context.strokeStyle = '#FF9900';
				context.beginPath();
					
				shape.forEach( ( point, index ) =>
				{
					const { x, y } = point;

					if( index == 0 )
						context.moveTo( x * zoom + center.x, y * zoom + center.y );		
					else 
						context.lineTo( x * zoom + center.x, y * zoom + center.y );

				} );
				
				const { x, y } = shape[ 0 ];
				
				context.lineTo( x * zoom + center.x, y * zoom + center.y );
				
				context.stroke();
				context.fill();
			} );
			
			context.globalAlpha = 1;
			
			shape.getSectors().forEach( sector =>
			{
				const { box, traverses, counterTraverses } = sector;
				const { spacing, lines } =  traverses;
				const { spacing:counterSpacing, lines:counterLines } =  counterTraverses;
				const boxCenter = box.getCenter( new Vector2() );
				const minX = center.x + zoom * ( box.min.x + TOP_BORDER_THICKNESS );
				const minY = center.y + zoom * ( box.min.y + TOP_BORDER_THICKNESS );
				const maxX = center.x + zoom * ( box.max.x - TOP_BORDER_THICKNESS );
				const maxY = center.y + zoom * ( box.max.y - TOP_BORDER_THICKNESS );
				
				context.lineWidth = 1;
				context.strokeStyle = '#0099FF';
				context.beginPath();
				context.moveTo( minX, minY );
				context.lineTo( maxX, minY );
				context.lineTo( maxX, maxY );
				context.lineTo( minX, maxY );
				context.lineTo( minX, minY );
				context.stroke();
				
				lines.forEach( ( traverse, index, array ) =>
				{
					context.lineWidth = 2;
					context.strokeStyle = ( index == 0 || index == array.length - 1 ) ? '#6600CC' : '#00CC99';
					context.beginPath();
					context.moveTo( center.x + zoom * traverse[ 0 ].x, center.y + zoom * traverse[ 0 ].y );
					context.lineTo( center.x + zoom * traverse[ 1 ].x, center.y + zoom * traverse[ 1 ].y );
					context.stroke();
				} );
				
				counterLines.forEach( ( traverse, index, array ) =>
				{
					context.lineWidth = 2;
					context.strokeStyle = ( index == 0 || index == array.length - 1 ) ? '#6600CC' : '#00CC99';
					context.beginPath();
					context.moveTo( center.x + zoom * traverse[ 0 ].x, center.y + zoom * traverse[ 0 ].y );
					context.lineTo( center.x + zoom * traverse[ 1 ].x, center.y + zoom * traverse[ 1 ].y );
					context.stroke();
				} );
				
				if( counterSpacing > 0 )
				{
					context.font = 'bold 14px sans-serif';
					
					const text = counterSpacing.toString();
					const x = center.x + boxCenter.x * zoom;
					const y = center.y + boxCenter.y * zoom;
					const width = context.measureText( text ).width;
					const height = Number.parseInt( context.font.replace( /\D/g, '' ) ); 

					context.fillStyle = '#FFFFFF';
					context.fillRect( x - width / 2 - 10, y - height / 2 - 10, width + 20, height + 20 );					
					context.fillStyle = '#FF0000';
					
					drawText( text, x, y, 0 );
				}
			} );*/
			
			
		}
		
		// console.log( performance.now() - timestamp );
	}
	
	render()
	{
		if( this._canvas.parentElement )
		{
			const { width, height } = this._canvas.parentElement?.getBoundingClientRect();

			if( this.width !== width || this.height !== height )
			{
				this.width = width;
				this.height = height;
				
				this._canvas.width = this.width;
				this._canvas.height = this.height;
				
				this.onPointerCancel();
				
				this._needsRender = true;
			}
		}
		
		if( this._needsRender )
		{
			this._needsRender = false;
			this.draw(); 
		}
		
		if( this._active )
		{
			this._requestId = requestAnimationFrame( () => this.render() );
		}
	}
}

export { View2D };  