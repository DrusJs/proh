import { EventDispatcher, MathUtils, Vector2, Box2, Color } from 'three';
import { isIntersect, getLinesIntersection, getProjectedPointOnLine, сlipperIntersect } from './utils/Geom.js';

export const SHAPE_TYPE_R = 'R'; // Rect
export const SHAPE_TYPE_L = 'L'; // L-Shaped
export const SHAPE_TYPE_S = 'S'; // S-Shaped
export const SHAPE_TYPE_U = 'U'; // U-Shaped
	   const SHAPE_TYPES = [ SHAPE_TYPE_R, SHAPE_TYPE_L, SHAPE_TYPE_S, SHAPE_TYPE_U ];

export const DECKING_ORIENTATION_VERTICAL = 'V'; // Vertical;
export const DECKING_ORIENTATION_HORIZONTAL = 'H'; // Horizontal;
	   const DECKING_ORIENTATIONS = [ DECKING_ORIENTATION_VERTICAL, DECKING_ORIENTATION_HORIZONTAL ];
	   
export const WALL_MATERIAL_BRICK = 'B'; // Brick
export const WALL_MATERIAL_RUBBLE = 'R'; // Rubble
export const WALL_MATERIAL_CONCRETE = 'C'; // Concrete
export const WALL_MATERIAL_OTHER = 'O'; // Other
	   const WALL_MATERIALS = [ WALL_MATERIAL_BRICK, WALL_MATERIAL_RUBBLE, WALL_MATERIAL_CONCRETE, WALL_MATERIAL_OTHER ];

export const SUPPORT_TYPE_WALL_MOUNT = 'WM'; // Wall Mount
export const SUPPORT_TYPE_POST = 'P'; // Post
	   const SUPPORT_TYPES = [ SUPPORT_TYPE_POST, SUPPORT_TYPE_WALL_MOUNT ];

export const MAX_DISTANCE_BETWEEN_SUPPORTS = 4000;
export const MIN_DISTANCE_BETWEEN_SUPPORTS = 1000;


export const BORDER_HEIGHT = 360; // Общая высота рамы
export const TOP_BORDER_HEIGHT = 68; // часть с настилом
export const DECKING_HEIGHT = 25; // высота настила
export const BOTTOM_BORDER_HEIGHT = 80;//BORDER_HEIGHT - TOP_BORDER_HEIGHT; // нижняя часть
export const BEAM_HEIGHT = BOTTOM_BORDER_HEIGHT; // Было 80, но это не правильно, должно быть равно нижней части, чтобы была полноценная конструкция
export const BEAM_TOP_HEIGHT = BORDER_HEIGHT - TOP_BORDER_HEIGHT - BOTTOM_BORDER_HEIGHT;
export const BOTTOM_DECKING_ELEVATION = 80; // Нижний настил приподнят на 80, высота настила должна быть направлена вверх!
export const TRAVERSE_HEIGHT = 100; // Высота траверсов 100, но это СОМНИТЕЛЬНО!
export const COUNTER_TRAVERS_HEIGHT = 43;

export const TOP_BORDER_THICKNESS = 60;
export const BOTTOM_BORDER_THICKNESS = 100;

export const MIN_SUPPORT_HEIGHT = 850 - BORDER_HEIGHT;
export const MAX_SUPPORT_HEIGHT = 3400 - BORDER_HEIGHT;
	   const SUPPORT_HEIGHT = 2500;
	   const BEAM_WIDTH = 100;

export const SUPPORT_RADIUS = 60;
export const DECKING_BOARD_WIDTH_140 = 140;
export const DECKING_BOARD_WIDTH_200 = 200;
	   const DECKING_BOARD_WIDTHS = [ DECKING_BOARD_WIDTH_140, DECKING_BOARD_WIDTH_200 ];   
export const DECKING_BOARD_LENGTH = 4000;
	   const DECKING_BOARD_SPACING = 2;
	   
export const TRAVERSE_WIDTH = 60;
export const COUNTER_TRAVERSE_WIDTH = 165;



const SECTION_LENGTH = 4000; // 4 meters
const MIN_LINE_LENGTH = 1000; // 1 meter
const MAX_LINE_LENGTH = 100000; // 100 meters

const WALL_WIDTH = 200;

const NO_ERROR = 0;
const LINE_MIN_LENGTH_ERROR = 1;
const LINE_MAX_LENGTH_ERROR = 2;
const LINE_DIRECTION_ERROR = 3;
const LINE_POSITION_ERROR = 4;
const SPACER_MIN_LENGTH_ERROR = 5;
const SPACER_MAX_LENGTH_ERROR = 6;
const SPACER_POSITION_ERROR = 7;

const DECKING_COLOR_LIST = [ '#cb9a73', '#966a57', '#8c8986', '#9c9b99', '#cecec6' ];
const DECKING_COLOR_NAMES = [ 'natural_line_oak_brown', 'natural_line_chestnut_brown', 'natural_line_graphi_grey', 'the_robust_grey', 'the_compact_grey' ];

const isObject = ( value ) =>
{
	if( value == null ) return false;
	if( typeof value !== 'object' ) return false;
	if( Array.isArray( value ) ) return false;
	
	return value.constructor === Object;
};

	
export class Shape extends EventDispatcher
{
	static getDeckingColorList()
	{
		const result = [];
		
		DECKING_COLOR_LIST.forEach( ( hex, index ) => result.push( { hex, key:DECKING_COLOR_NAMES[ index ] } ) );
		
		return result;
	}
	
	toJSON()
	{
		const json = 
		{
			area:this._area,
			version:this._version,
			type:this._type,
			rotation:this._rotation,
			elevation:this._elevation,
			
			deckingColor:this._deckingColor,
			deckingOrientation:this._deckingOrientation,
			deckingBoardWidth:this._deckingBoardWidth,
			wallMmaterial:this._wallMaterial,
			points:[],
			lines:[],
			supports:[],
		};
		
		this._points.forEach( point =>
		{
			const { name, position } = point;
			
			json.points.push( { name, position } );
		} );
		
		this._lines.forEach( line =>
		{
			const { name, direction, normal, hasWall } = line;
			
			json.lines.push( { name, direction, normal, hasWall } );
		} );
		
		
		this._supports.forEach( support =>
		{
			const { name, type, position, height, isMovable } = support;
			const _support = { name, type, height };
			
			if( isMovable )
			{
				_support.position = position;
			}
			
			json.supports.push( _support );
		} );
		
		return json;
	}
	
	constructor( type ) 
	{
		// console.log( 'Shape [ ' + type + ' ]' );
		
		super();
		
		this._area = 'balcon';
		this._type = type;
		this._version = 1;
		this._rotation = 0;
		this._canRotate = false;
		this._canFlipX = false;
		this._spacers = [];
		this._supports = [];
		this._distancesBetweenSupports = [];
		this._supportsVersion = 0;
		this._elevation = SUPPORT_HEIGHT;
		this._bottomDeckingBoards = [];
		this._bottomDeckingEnabled = true;
		this._deckingBoards = [];
		this._deckingColor = DECKING_COLOR_LIST[ 0 ];	
		this._deckingEnabled = true;
		this._deckingBoardWidth = DECKING_BOARD_WIDTH_140;
		//this._deckingOffsetX = 0;
		//this._deckingOffsetY = 0;
		this._deckingOrientationList = [ DECKING_ORIENTATION_VERTICAL, DECKING_ORIENTATION_HORIZONTAL ];
		this._deckingOrientation = DECKING_ORIENTATION_HORIZONTAL;
		this._wallMaterial = WALL_MATERIAL_BRICK;

		const restrictions = {};
		
		const json = ( () =>
		{
			if( isObject( type ) )
			{
				const json = type;
				
				if( json.area !== this._area ||
					json.version !== this._version ||
					!SHAPE_TYPES.includes( json.type ) ||
					( !Number.isInteger( json.rotation ) || json.rotation % 90 !== 0 || json.rotation < 0 || json.rotation > 270 ) ||
					( !Number.isInteger( json.elevation ) || json.elevation > MAX_SUPPORT_HEIGHT || json.elevation < MIN_SUPPORT_HEIGHT ) ||
					!WALL_MATERIALS.includes( json.wallMmaterial ) ||
					!DECKING_ORIENTATIONS.includes( json.deckingOrientation ) ||
					!DECKING_BOARD_WIDTHS.includes( json.deckingBoardWidth ) ||
					!Array.isArray( json.points ) ||
					!Array.isArray( json.lines ) ||
					!Array.isArray( json.supports ) 
				)
				{
					throw new Error();
				}
				
				this._type = json.type;
				this._rotation = json.rotation;
				this._elevation = json.elevation;
				this._wallMaterial = json.wallMmaterial;
				this._deckingOrientation = json.deckingOrientation;
				this._deckingBoardWidth = json.deckingBoardWidth;
				this._deckingColor = DECKING_COLOR_LIST.includes( json.deckingColor ) ? json.deckingColor : DECKING_COLOR_LIST[ 0 ];
				
				return json;
			}
			
			return null;			
		} )();
		
		const getPointsFromJSON = () =>
		{
			if( json )
			{
				const points = [];
				
				json.points.forEach( point =>
				{
					const { name, position } = point;	
					points.push( { name, position:new Vector2( position.x, position.y ) } );
				} );
				
				return points;
			}
			
			return null;
		};
	
		const getJSONLine = ( name ) =>
		{
			if( json )
			{
				const { direction, normal, hasWall } = json.lines.find( line => line.name === name );
				const line = 
				{ 
					direction:new Vector2( direction.x, direction.y ), 
					normal:new Vector2( normal.x, normal.y ),
					hasWall,
				};
				
				return line;
			}
			
			return null;
		};
		
		if( this._type === SHAPE_TYPE_R )
		{
			/*
			   A ____ B
				|    |
			    |____|
			   D      C
			*/
			
			this._points = getPointsFromJSON() ??
			[
				{ name:'A', position:new Vector2( 0, 0 ) }, 		// A
				{ name:'B', position:new Vector2( 2000, 0 ) }, 		// B
				{ name:'C', position:new Vector2( 2000, 1000 ) }, 	// C
				{ name:'D', position:new Vector2( 0, 1000 ) }, 		// D
			];
			
			Object.assign( restrictions, 
			{
				'AB':{ min:1000, max:20000 },
				'BC':{ min:1000, max:12000 },
				'CD':{ min:1000, max:20000 },
				'DA':{ min:1000, max:12000 },
			} );
			
			/*Object.assign( restrictions, 
			{
				'AB':{ min:1000, max:3000 },
				'BC':{ min:1000, max:3000 },
				'CD':{ min:1000, max:3000 },
				'DA':{ min:1000, max:3000 },
			} );*/
					
			this._inputables = [ 'AB', 'BC' ]; // CD, DA
			this._isRect = true;
		}
		else if( this._type === SHAPE_TYPE_L )
		{
			/*
			   A ____ B
				|    |
				|    |____ D
				|   C     |
				|_________|
			   F           E
			*/
			
			this._points = getPointsFromJSON() ??
			[
				{ name:'A', position:new Vector2( 0, 0 ) }, 		// A
				{ name:'B', position:new Vector2( 1000, 0 ) }, 		// B
				{ name:'C', position:new Vector2( 1000, 1000 ) }, 	// C
				{ name:'D', position:new Vector2( 2000, 1000 ) }, 	// D
				{ name:'E', position:new Vector2( 2000, 2000 ) }, 	// E
				{ name:'F', position:new Vector2( 0, 2000 ) }, 		// F
			];
			
			Object.assign( restrictions, 
			{
				'AB':{ min:1000, max:4000 },
				'BC':{ min:1000, max:4000 },
				'CD':{ min:1000, max:8000 },
				'DE':{ min:1000, max:4000 },
				'EF':{ min:2000, max:12000 },
				'FA':{ min:2000, max:8000 },
			} );
			
			this._inputables = [ 'AB', 'BC', 'CD', 'DE' ]; // 'EF', 'FA'
			this._canFlipX = true;
			this._canRotate = true;
			this._isLShaped = true;
		
		}
		else if( this._type === SHAPE_TYPE_S )
		{
			/*
			   A ____ B  
				|    |    
				|    |_________ D
				|   C          |
				|_________  G  |
			   H          |    |
						  |    |
						  |____|
						 F      E   
			*/
		
			this._points = getPointsFromJSON() ??
			[
				{ name:'A', position:new Vector2( 0, 0 ) }, 		// A
				{ name:'B', position:new Vector2( 1000, 0 ) }, 		// B
				{ name:'C', position:new Vector2( 1000, 1000 ) }, 	// C
				{ name:'D', position:new Vector2( 3000, 1000 ) }, 	// D
				{ name:'E', position:new Vector2( 3000, 3000 ) }, 	// E
				{ name:'F', position:new Vector2( 2000, 3000 ) }, 	// F
				{ name:'G', position:new Vector2( 2000, 2000 ) }, 	// G
				{ name:'H', position:new Vector2( 0, 2000 ) }, 		// H
			];
			
			Object.assign( restrictions, 
			{
				'AB':{ min:1000, max:4000 },
				'BC':{ min:1000, max:8000 },
				'CD':{ min:2000, max:8000 }, // min:2000 ?
				'DE':{ min:2000, max:12000 },
				'EF':{ min:1000, max:4000 },
				'FG':{ min:1000, max:8000 },
				'GH':{ min:2000, max:8000 }, // min:2000 ?
				'HA':{ min:2000, max:12000 },
			} );

			this._inputables = [ 'AB', 'BC', 'CD', 'DE', 'EF', 'FG', 'GH', 'HA' ]; // 
			this._spacers = 
			[ 
				{ a:'CD', b:'GH', minLength:1000, maxLength:4000 },
				{ a:'BC', b:'FG', minLength:1000, maxLength:8000 } 
			];
			
			this._canFlipX = true;
			this._canRotate = true;
			this._isSShaped = true;
			
		}
		else if( this._type === SHAPE_TYPE_U ) 
		{
			/*
			   A ____ B  E ____ F
				|    |    |    |
				|    |____|    |
				|   C      D   |
				|______________|
			   H                G
			*/
		
			this._points = getPointsFromJSON() ??
			[
				{ name:'A', position:new Vector2( 0, 0 ) }, 		// A
				{ name:'B', position:new Vector2( 1000, 0 ) }, 		// B
				{ name:'C', position:new Vector2( 1000, 1000 ) }, 	// C
				{ name:'D', position:new Vector2( 2000, 1000 ) }, 	// D
				{ name:'E', position:new Vector2( 2000, 0 ) }, 		// E
				{ name:'F', position:new Vector2( 3000, 0 ) }, 		// F
				{ name:'G', position:new Vector2( 3000, 2000 ) }, 	// G
				{ name:'H', position:new Vector2( 0, 2000 ) }, 		// H
			];
			
			Object.assign( restrictions, 
			{
				'AB':{ min:1000, max:4000 },
				'BC':{ min:1000, max:8000 },
				'CD':{ min:1000, max:4000 },
				'DE':{ min:1000, max:8000 },
				'EF':{ min:1000, max:4000 },
				'FG':{ min:2000, max:12000 },
				'GH':{ min:3000, max:16000 },
				'HA':{ min:2000, max:12000 },
			} );

			this._inputables = [ 'AB', 'BC', 'CD', 'DE', 'EF', 'FG', 'GH', 'HA'  ];
			this._spacers = [ { a:'CD', b:'GH', minLength:1000, maxLength:4000 } ];
			this._canRotate = true;	
			this._isUShaped = true;
		}
		else 
		{
			throw new Error();
		}
		
		// init

		this._lines = [];

		for( let i = 0; i < this._points.length; i++ )
		{
			const start = this._points[ i ];
			const end = this._points[ ( i + 1 ) % this._points.length ];
			const name = start.name + end.name;
			const jsonLine = getJSONLine( name );
			const direction =  jsonLine ? jsonLine.direction : new Vector2().subVectors( end.position, start.position ).normalize().round();
			const normal = jsonLine ? jsonLine.normal : new Vector2( direction.y, -direction.x );
			const inputable = this._inputables.includes( name );
			const hasWall = jsonLine ? jsonLine.hasWall : false;
			
			let minLength = MIN_LINE_LENGTH;
			let maxLength = MAX_LINE_LENGTH;
			
			if( restrictions[ name ] )
			{
				const { min, max } = restrictions[ name ];
				
				minLength = min;
				maxLength = max;
			}
			
			const line = { name, start, end, direction, normal, inputable, hasWall, minLength, maxLength };
			
			this._lines.push( line );
		}
		
		this._spacers.forEach( spacer => 
		{
			const { a, b } = spacer;
			const line1 = this._getLine( a );
			const line2 = this._getLine( b );	
			const { x, y } = line1.start.position;
			const { x:x1, y:y1 } = line2.start.position;
			const { x:x2, y:y2 } = line2.end.position;	
			
			// Не должны меняться местами! ( нормаль к A пересекает B - неизменное состояние )
			const intersection = getLinesIntersection
			(
				x, y,
				x + MAX_LINE_LENGTH * line1.normal.x, y + MAX_LINE_LENGTH * line1.normal.y,
				x1 - MAX_LINE_LENGTH * line2.direction.x, y1 - MAX_LINE_LENGTH * line2.direction.y,
				x2 + MAX_LINE_LENGTH * line2.direction.x, y2 + MAX_LINE_LENGTH * line2.direction.y,
			)
			
			spacer.aNormalIntersectsB = intersection.isOnLine;
		} );

		this._center();	
		this._computeGeometry();
		this._computeSupports( json );
		this._computeDecking();
	}
	
	getType()
	{
		return this._type;
	}
	
	getOuterBox()
	{
		const outerBox = new Box2();
		
		this._points.forEach( point => outerBox.expandByPoint( point.position ) );
		
		return outerBox;
	}
	
	_computeGeometry()
	{
		// TODO:
		/*
			ширина и высота внешнего контура
			расчет внутреннего контура
			ширина и высота внутреннего контура
			ширина и высота настила ( может быть сложнее )			
		*/
		const outerBox = new Box2();
		const topInnerBox = new Box2();

		this._topInnerPoints = [];
		this._bottomInnerPoints = [];
		
		this._points.forEach( point =>
		{
			const lineTo = this._getLineToPoint( point );
			const lineFrom = this._getLineFromPoint( point );
			const topInnerNormal = new Vector2().addVectors( lineTo.normal, lineFrom.normal ).multiplyScalar( TOP_BORDER_THICKNESS ).negate();
			const bottomInnerNormal = new Vector2().addVectors( lineTo.normal, lineFrom.normal ).multiplyScalar( BOTTOM_BORDER_THICKNESS ).negate();
			
			const { name, position } = point;
			const topInnerPosition = position.clone().add( topInnerNormal );
			const bottomInnerPosition = position.clone().add( bottomInnerNormal );
			
			outerBox.expandByPoint( position );
			topInnerBox.expandByPoint( topInnerPosition );
			
			this._topInnerPoints.push( { name, position:topInnerPosition } );
			this._bottomInnerPoints.push( { name, position:bottomInnerPosition } );
		} );
		
		const outerSize = outerBox.getSize( new Vector2() );
		const topInnerSize = topInnerBox.getSize( new Vector2() );
		
		this._outerWidth = outerSize.x;
		this._outerHeight = outerSize.y;
		this._topInnerWidth = topInnerSize.x;
		this._topInnerHeight = topInnerSize.y;
		
		//

		//this._deckingOffsetX = 0;
		//this._deckingOffsetY = 0;
		
		if( this._isRect )
		{
			if( this._outerWidth <= DECKING_BOARD_LENGTH && this._outerHeight <= DECKING_BOARD_LENGTH )
			{
				this._deckingOrientationList = [ DECKING_ORIENTATION_HORIZONTAL, DECKING_ORIENTATION_VERTICAL ];
			}
			else if( this._outerWidth > this._outerHeight )
			{
				this._deckingOrientationList = [ DECKING_ORIENTATION_VERTICAL ];
			}
			else 
			{
				this._deckingOrientationList = [ DECKING_ORIENTATION_HORIZONTAL ];
			}
		}
		else if( this._isSShaped || this._isUShaped )
		{
			if( this._rotation % 180 === 0 )
				this._deckingOrientationList = [ DECKING_ORIENTATION_VERTICAL ];
			else 
				this._deckingOrientationList = [ DECKING_ORIENTATION_HORIZONTAL ];
		}
		else if( this._isLShaped )
		{
			if( this._outerWidth < this._outerHeight )
				this._deckingOrientationList = [ DECKING_ORIENTATION_HORIZONTAL ];		
			else 
				this._deckingOrientationList = [ DECKING_ORIENTATION_VERTICAL ];
		}
		else 
		{
			throw new Error();
		}
		
		if( !this._deckingOrientationList.includes( this._deckingOrientation ) )
		{
			this._deckingOrientation = this._deckingOrientationList[ 0 ];
		}

		
		/*if( this._deckingOrientation === DECKING_ORIENTATION_HORIZONTAL )
		{
			if( this._topInnerWidth + TOP_BORDER_THICKNESS <= DECKING_BOARD_LENGTH ) 
			{
				this._maxDeckingOffsetX = 0;
			}
			else
			{				
				this._maxDeckingOffsetX = DECKING_BOARD_LENGTH - 1;
			}
		}
		else 
		{
			this._maxDeckingOffsetX = this._deckingBoardWidth - 1;
		}
		
		if( this._deckingOrientation === DECKING_ORIENTATION_VERTICAL )
		{
			if( this._topInnerHeight + TOP_BORDER_THICKNESS <= DECKING_BOARD_LENGTH ) 
			{
				this._maxDeckingOffsetY = 0;
			}
			else
			{				
				this._maxDeckingOffsetY = DECKING_BOARD_LENGTH - 1;
			}
		}
		else 
		{
			this._maxDeckingOffsetY = this._deckingBoardWidth - 1;
		}*/
	}
	
	_getCenter()
	{
		const box = new Box2();
		const center = new Vector2();
		
		this._points.forEach( point => box.expandByPoint( point.position ) );

		box.getCenter( center );
		
		return center.round();
	}

	_center()
	{
		const center = this._getCenter();

		this._points.forEach( point => point.position.sub( center ) );
	}
	
	_computeDecking()
	{
		// console.log( '_computeDecking' );
		
		this._deckingBoards = [];
		this._bottomDeckingBoards = [];
		
		if( this._deckingEnabled )
		{
			// const time = performance.now();

			const box = new Box2();

			this._points.forEach( point => box.expandByPoint( point.position ) );

			const MIN_Y = box.min.y;// + ( this._deckingOffsetY > 0 ? -( this.getMaxDeckingOffsetY() - this._deckingOffsetY ) : 0 );
			const MAX_Y = box.max.y;
			const MIN_X = box.min.x;// + ( this._deckingOffsetX > 0 ? -( this.getMaxDeckingOffsetX() - this._deckingOffsetX ) : 0 );
			const MAX_X = box.max.x;	
			const MIN_EDGE_LENGTH = 50;	
			const BOARD_WIDTH = this._deckingBoardWidth - DECKING_BOARD_SPACING;
			const BOARD_HEIGHT = DECKING_BOARD_LENGTH - DECKING_BOARD_SPACING;

			const addBoard = ( subjectPolygon, x, y, width, height ) =>
			{
				const clipPolygon = [ [ x, y ], [ x + width, y ], [ x + width, y + height ], [ x, y + height ] ];			
				const shapes = сlipperIntersect( subjectPolygon, clipPolygon );
				const shapesNum = shapes.length;
				const pointsNum = shapes.flat().length;
				const rectShapeHasError = ( points ) =>
				{
					let hasError = false;
					
					for( let i = 0; i < 2; i++ )
					{
						if( points[ i ].distanceTo( points[ i + 1 ] ) < MIN_EDGE_LENGTH )
						{
							return true;
						}
					}
					
					return false;
				}
				
				if( pointsNum === 0 )
				{
				}
				else if( shapesNum === 1 && pointsNum === 4 ) 
				{
					this._deckingBoards.push( { shapes, hasError:rectShapeHasError( shapes[ 0 ] ) } );
				}
				else if( shapesNum === 2 && pointsNum === 8 )
				{
					this._deckingBoards.push( { shapes, hasError:rectShapeHasError( shapes[ 0 ] ) || rectShapeHasError( shapes[ 1 ] ) } );
				}
				else 
				{
					let hasError = false;
					
					for( let s = 0; s < shapesNum; s++ )
					{
						const points = shapes[ s ];

						for( let i = 0; i < points.length; i++ )
						{
							const i2 = ( i + 1 ) % points.length;
							const start = points[ i ];
							const end = points[ i2 ];	
							const direction = new Vector2().subVectors( end, start ).normalize().round();

							for( let a = 0; a < points.length; a++ )
							{
								if( a !== i )
								{
									const start2 = points[ a ];
									const end2 = points[ ( a + 1 ) % points.length ];

									const intersection = getLinesIntersection
									(
										end.x, end.y, end.x + 10000 * direction.x, end.y + 10000 * direction.y,
										start2.x, start2.y, end2.x, end2.y
									);

									if( intersection && intersection.isOnLine && !intersection.point.round().equals( end ) )
									{
										const distance = end2.distanceTo( intersection.point );
										
										if( distance > 0 && distance < MIN_EDGE_LENGTH )
										{
											// console.warn( distance );
											hasError = true;
											break;
										}
									}
									
									const intersection2 = getLinesIntersection
									(
										start.x, start.y, start.x - 10000 * direction.x, start.y - 10000 * direction.y,
										start2.x, start2.y, end2.x, end2.y
									);

									if( intersection2 && intersection2.isOnLine && !intersection2.point.round().equals( start ) )
									{
										const distance = start2.distanceTo( intersection2.point );
										
										if( distance > 0 && distance < MIN_EDGE_LENGTH )
										{
											// console.warn( distance );
											hasError = true;
											break;
										}
									}									
								}
							}
							
							if( hasError )
								break;
						}
						
						if( hasError )
							break;
					}
					
					this._deckingBoards.push( { shapes, hasError } );					
				}
			};
			
			
			const contourPolygon = this._topInnerPoints.map( point => [ point.position.x, point.position.y ] );
			
			let y;
			let x;
			
			if( this._deckingOrientation == DECKING_ORIENTATION_VERTICAL )
			{
				x = MIN_X;
				
				while( x < MAX_X )
				{
					y = MIN_Y;
					
					while( y < MAX_Y )
					{					
						addBoard( contourPolygon, x, y, BOARD_WIDTH, BOARD_HEIGHT );						
						y += BOARD_HEIGHT + DECKING_BOARD_SPACING;
					}
					
					x += BOARD_WIDTH + DECKING_BOARD_SPACING;
				}
			}
			else 
			{
				y = MIN_Y;
				
				while( y < MAX_Y )
				{
					x = MIN_X;
					
					while( x < MAX_X )
					{	
						addBoard( contourPolygon, x, y, BOARD_HEIGHT, BOARD_WIDTH );
						x += BOARD_HEIGHT + DECKING_BOARD_SPACING;
					}
					
					y += BOARD_WIDTH + DECKING_BOARD_SPACING;
				}
			}
			
			// console.log( performance.now() - time );	
		}
		
		
		// bottom decking
		if( this._bottomDeckingEnabled )
		{
			const box = new Box2();

			this._points.forEach( point => box.expandByPoint( point.position ) );
			
			const size = box.getSize( new Vector2() );

			const MIN_Y = box.min.y;
			const MAX_Y = box.max.y;
			const MIN_X = box.min.x;
			const MAX_X = box.max.x;	
			const BOARD_WIDTH = 475 - DECKING_BOARD_SPACING;
			const BOARD_HEIGHT = Math.max( size.x, size.y );
			
			const addBoard = ( subjectPolygon, x, y, width, height ) =>
			{
				const clipPolygon = [ [ x, y ], [ x + width, y ], [ x + width, y + height ], [ x, y + height ] ];			
				const shapes = сlipperIntersect( subjectPolygon, clipPolygon );
				const shapesNum = shapes.length;
				const pointsNum = shapes.flat().length;
				
				if( pointsNum > 0 )
				{
					this._bottomDeckingBoards.push( { shapes } );
				}
			};
			
			// const contourPolygon = this._bottomInnerPoints.map( point => [ point.position.x, point.position.y ] );
			const contourPolygon = this._topInnerPoints.map( point => [ point.position.x, point.position.y ] );

			
			let y;
			let x;
			
			if( this._deckingOrientation == DECKING_ORIENTATION_VERTICAL )
			{
				x = MIN_X;
				
				while( x < MAX_X )
				{
					y = MIN_Y;
					
					while( y < MAX_Y )
					{					
						addBoard( contourPolygon, x, y, BOARD_WIDTH, BOARD_HEIGHT );						
						y += BOARD_HEIGHT + DECKING_BOARD_SPACING;
					}
					
					x += BOARD_WIDTH + DECKING_BOARD_SPACING;
				}
			}
			else 
			{
				y = MIN_Y;
				
				while( y < MAX_Y )
				{
					x = MIN_X;
					
					while( x < MAX_X )
					{	
						addBoard( contourPolygon, x, y, BOARD_HEIGHT, BOARD_WIDTH );
						x += BOARD_HEIGHT + DECKING_BOARD_SPACING;
					}
					
					y += BOARD_WIDTH + DECKING_BOARD_SPACING;
				}
			}
		}
		
		this.dispatchEvent( { type:'deckingRecomputed' } );
	}
	
	_updateBeam( beam )
	{
		const { A, B, isFirst } = beam;
		
		if( A && B )
		{
			let yShift = isFirst ? -BEAM_WIDTH - 1 : 1; // Сдвиг по миллиметру в каждую сторону, чтобы не слипались балки!
			
			beam.points =
			[
				A.edgePosition.clone().addScaledVector( A.lineFrom.direction, yShift ).addScaledVector( A.lineFrom.normal, -BOTTOM_BORDER_THICKNESS ),
				A.edgePosition.clone().addScaledVector( A.lineFrom.direction, yShift + BEAM_WIDTH ).addScaledVector( A.lineFrom.normal, -BOTTOM_BORDER_THICKNESS ),
				B.edgePosition.clone().addScaledVector( A.lineFrom.direction, yShift + BEAM_WIDTH ).addScaledVector( A.lineFrom.normal, BOTTOM_BORDER_THICKNESS ),
				B.edgePosition.clone().addScaledVector( A.lineFrom.direction, yShift ).addScaledVector( A.lineFrom.normal, BOTTOM_BORDER_THICKNESS )
			];
			
			yShift = isFirst ? -TOP_BORDER_THICKNESS - 1 : 1; // Сдвиг по миллиметру в каждую сторону, чтобы не слипались балки!
			
			beam.points2 =
			[
				A.edgePosition.clone().addScaledVector( A.lineFrom.direction, yShift ).addScaledVector( A.lineFrom.normal, -TOP_BORDER_THICKNESS ),
				A.edgePosition.clone().addScaledVector( A.lineFrom.direction, yShift + TOP_BORDER_THICKNESS ).addScaledVector( A.lineFrom.normal, -TOP_BORDER_THICKNESS ),
				B.edgePosition.clone().addScaledVector( A.lineFrom.direction, yShift + TOP_BORDER_THICKNESS ).addScaledVector( A.lineFrom.normal, TOP_BORDER_THICKNESS ),
				B.edgePosition.clone().addScaledVector( A.lineFrom.direction, yShift ).addScaledVector( A.lineFrom.normal, TOP_BORDER_THICKNESS )
			];
			
			// console.log( beam );
		}
	}
	
	_computeSupports( json = null )
	{
		// console.log( 'compute' );
		const getJSONSupport = ( name ) =>
		{
			if( json )
			{
				const { type, position, height } = json.supports.find( support => support.name === name );
				const support = { type, height };
				
				if( position )
				{
					support.position = new Vector2( position.x, position.y );
				}
				
				return support;
			}
			
			return null;
		};
		
		const sectors = []; // Точки по которым будут построены прямоугольники секций
		const beams = [];
		const supports = [];
		const distancesBetweenSupports = [];
		
		this._sectorLines = null;
		
		const _addOppositeSupports = ( name1, name2, iSupports ) =>
		{
			const line2 = this._getLine( name2 );
			const hasWall = line2.hasWall && this._wallMaterial !== WALL_MATERIAL_OTHER;
			
			iSupports.forEach( support =>
			{
				const intersection = getLinesIntersection
				( 
					support.position.x, support.position.y,
					support.position.x + line2.normal.x, support.position.y + line2.normal.y,
					line2.start.position.x, line2.start.position.y,
					line2.end.position.x, line2.end.position.y,
				);

				const supportName = support.name + '-o'; // opposite
				const jsonSupport = getJSONSupport( supportName );
			
				supports.push
				( { 
					name:supportName, 
					uuid:MathUtils.generateUUID(),
					lineFrom:line2,
					type:jsonSupport ? jsonSupport.type : ( hasWall ? SUPPORT_TYPE_WALL_MOUNT : SUPPORT_TYPE_POST ),
					height:jsonSupport ? jsonSupport.height : this._elevation,
					position:intersection.point.clone().addScaledVector( line2.normal, -SUPPORT_RADIUS ),
					edgePosition:intersection.point.clone(),
					normal:line2.normal.clone(),
					isMovable:false,
				} );
			} );
		};
		
		const _addIntersectionSupport = ( name1, name2 ) =>
		{
			const line1 = this._getLine( name1 );
			const line2 = this._getLine( name2 );
			const hasWall = line1.hasWall && this._wallMaterial !== WALL_MATERIAL_OTHER;
			const intersection = getLinesIntersection
			( 
				line1.start.position.x, line1.start.position.y,
				line1.end.position.x, line1.end.position.y,
				line2.start.position.x, line2.start.position.y,
				line2.end.position.x, line2.end.position.y,
			);

			const supportName = line1.name + '-' + line2.name;
			const jsonSupport = getJSONSupport( supportName );
							
			supports.push
			( { 
				name:supportName, 
				uuid:MathUtils.generateUUID(),
				lineFrom:line1,
				type:jsonSupport ? jsonSupport.type : ( hasWall ? SUPPORT_TYPE_WALL_MOUNT : SUPPORT_TYPE_POST ),
				height:jsonSupport ? jsonSupport.height : this._elevation,
				position:intersection.point.clone().addScaledVector( line1.normal, -SUPPORT_RADIUS ).addScaledVector( line2.normal, -SUPPORT_RADIUS ),
				edgePosition:intersection.point.clone(),
				normal:line1.normal.clone(),
				isMovable:false,
			} );
		};
		
		const _addIntermidiateSupports = ( name ) =>
		{
			const line = this._getLine( name );
			const { start, end, normal, direction } = line;
			const hasWall = line.hasWall && this._wallMaterial !== WALL_MATERIAL_OTHER;
			const startSupport = supports.find( support => support.name == start.name );
			const startSupportPosition = start.position.clone().add( normal.clone().multiplyScalar( -SUPPORT_RADIUS ) );
			const endSupport = supports.find( support => support.name == end.name );
			const endSupportPosition = end.position.clone().add( normal.clone().multiplyScalar( -SUPPORT_RADIUS ) );
			const distance = Math.round( startSupportPosition.distanceTo( endSupportPosition ) );
			
			const intermidiateSupports = [];
			
			if( distance > SECTION_LENGTH )
			{
				const sectionsNum = Math.ceil( ( distance ) / SECTION_LENGTH );
				const supportsNum = sectionsNum - 1;

				if( supportsNum > 0 )
				{
					const sectionLength = distance / sectionsNum;
					
					for( let i = 0; i < supportsNum; i++ )
					{
						const position = startSupportPosition.clone().addScaledVector( direction, sectionLength * ( i + 1 ) ).round();
						const supportName = startSupport.name + i + endSupport.name;
						const jsonSupport = getJSONSupport( supportName );
				
						const support = 
						{ 
							name:supportName, 
							prevName:( i == 0 ) ? startSupport.name : startSupport.name + ( i - 1 ) + endSupport.name,
							nextName:( i < supportsNum - 1 ) ? startSupport.name + ( i + 1 ) + endSupport.name : endSupport.name,
							uuid:MathUtils.generateUUID(),
							type:jsonSupport ? jsonSupport.type : ( hasWall ? SUPPORT_TYPE_WALL_MOUNT : SUPPORT_TYPE_POST ),
							height:jsonSupport ? jsonSupport.height : this._elevation,
							position,
							edgePosition:position.clone().addScaledVector( normal, SUPPORT_RADIUS ),
							normal:normal.clone(),
							lineFrom:line,
							isMovable:false,
						};
						
						supports.push( support );
						intermidiateSupports.push( support );
					}
				}
			}
			
			return intermidiateSupports;
		};
			
		// Угловые опоры для всех фигур!
		this._points.forEach( point =>
		{
			const lineTo = this._getLineToPoint( point );
			const lineFrom = this._getLineFromPoint( point );
			const { name, position } = point;
			const normal = new Vector2().addVectors( lineTo.normal, lineFrom.normal ); // not real normal!
			const hasWall = ( lineFrom?.hasWall || lineTo?.hasWall ) && this._wallMaterial !== WALL_MATERIAL_OTHER;
			const jsonSupport = getJSONSupport( name );
			
			supports.push
			( { 
				name, 
				uuid:MathUtils.generateUUID(),
				type:jsonSupport ? jsonSupport.type : ( hasWall ? SUPPORT_TYPE_WALL_MOUNT : SUPPORT_TYPE_POST ),
				height:jsonSupport ? jsonSupport.height : this._elevation,
				position:point.position.clone().add( normal.clone().multiplyScalar( -SUPPORT_RADIUS ) ),
				edgePosition:point.position.clone(),
				normal:normal.normalize(),
				lineTo, 
				lineFrom,
				isCorner:true,
				isMovable:false,
			} );					
		} );
		
		if( this._isRect )
		{
			const hSupports = [];
			const vSupports = [];
		
			// Промежуточные опоры расположенные на гранях AB и BC
			this._points.forEach( point =>
			{
				const startSupport = supports.find( support => support.name == point.name );
				const line = startSupport.lineFrom;
				const { name, start, end, normal, direction } = line;
				const hasWall = line.hasWall && this._wallMaterial !== WALL_MATERIAL_OTHER;
				const startSupportPosition = start.position.clone().add( normal.clone().multiplyScalar( -SUPPORT_RADIUS ) );
				const endSupport = supports.find( support => support.name == end.name );
				const endSupportPosition = end.position.clone().add( normal.clone().multiplyScalar( -SUPPORT_RADIUS ) );
				const distance = Math.round( startSupportPosition.distanceTo( endSupportPosition ) );

				if( [ 'AB', 'BC' ].includes( name ) && distance > SECTION_LENGTH )
				{
					const sectionsNum = Math.ceil( ( distance ) / SECTION_LENGTH );
					const supportsNum = sectionsNum - 1;
					
					// console.log( name + '-' + nextName + ' > ' + distance );
					
					if( supportsNum > 0 )
					{
						const sectionLength = distance / sectionsNum;
						
						for( let i = 0; i < supportsNum; i++ )
						{
							const supportName = startSupport.name + i + endSupport.name;
							const jsonSupport = getJSONSupport( supportName );
							const position = startSupportPosition.clone().addScaledVector( direction, sectionLength * ( i + 1 ) ).round();
							
							if( jsonSupport )
							{
								position.copy( jsonSupport.position );
							}
							
							const support = 
							{ 
								name:supportName, 
								prevName:( i == 0 ) ? startSupport.name : startSupport.name + ( i - 1 ) + endSupport.name,
								nextName:( i < supportsNum - 1 ) ? startSupport.name + ( i + 1 ) + endSupport.name : endSupport.name,
								uuid:MathUtils.generateUUID(),
								type:jsonSupport ? jsonSupport.type : ( hasWall ? SUPPORT_TYPE_WALL_MOUNT : SUPPORT_TYPE_POST ),
								height:jsonSupport ? jsonSupport.height : this._elevation,
								position,
								edgePosition:position.clone().addScaledVector( normal, SUPPORT_RADIUS ),
								normal:normal.clone(),
								lineFrom:line,
								isMovable:true,
								ray:position.clone().addScaledVector( normal.clone().negate(), MAX_LINE_LENGTH ),
								axis:Math.abs( direction.x ) > Math.abs( direction.y ) ? 'x' : 'y',
								children:[],
							};

							supports.push( support );
							
							if( name === 'AB' )
							{
								hSupports.push( support );
							}						
							else if( name === 'BC' )
							{
								vSupports.push( support );
							}						
						}
					}
				}	
			} );
	
			// Опоры на местах пересечений от нормалей промежуточных опор
			if( hSupports.length > 0 && vSupports.length > 0 )
			{
				for( let a = 0; a < hSupports.length; a++ )
				{
					const A = hSupports[ a ];

					for( let b = 0; b < vSupports.length; b++ )
					{
						const B = vSupports[ b ];

						const intersection = getLinesIntersection
						( 
							A.position.x, A.position.y,
							A.ray.x, A.ray.y,
							B.position.x, B.position.y,
							B.ray.x, B.ray.y,
						);
						
						const supportName = A.name + '-' + B.name;
						const jsonSupport = getJSONSupport( supportName );
						const support = 
						{ 
							name:supportName, 
							uuid:MathUtils.generateUUID(),
							type:SUPPORT_TYPE_POST, // TODO: Нельзя менять тип опоры, учесть это в JSON?
							height:jsonSupport ? jsonSupport.height : this._elevation,
							position:intersection.point.clone(),
							edgePosition:intersection.point.clone().add( new Vector2( SUPPORT_RADIUS, 0 ) ),
							normal:new Vector2( 1, 0 ),
							isMovable:false,
						};
						
						A.children.push( support );
						B.children.push( support );
						
						supports.push( support );
					}
				}
			}
		
			// Для всех hSupports пересечение с CD
			for( let a = 0; a < hSupports.length; a++ )
			{
				const A = hSupports[ a ];
				const line = this._getLine( 'CD' );
				const hasWall = line.hasWall && this._wallMaterial !== WALL_MATERIAL_OTHER;	
				const intersection = getLinesIntersection
				( 
					A.position.x, A.position.y,
					A.ray.x, A.ray.y,
					line.start.position.x, line.start.position.y,
					line.end.position.x, line.end.position.y,
				);
				
				const supportName = A.name + '-o'; // opposite
				const jsonSupport = getJSONSupport( supportName );
				const support = 
				{ 
					name:supportName, 
					uuid:MathUtils.generateUUID(),
					lineFrom:line,
					type:jsonSupport ? jsonSupport.type : ( hasWall ? SUPPORT_TYPE_WALL_MOUNT : SUPPORT_TYPE_POST ),
					height:jsonSupport ? jsonSupport.height : this._elevation,
					position:intersection.point.clone().addScaledVector( line.normal, -SUPPORT_RADIUS ),
					edgePosition:intersection.point.clone(),
					normal:line.normal.clone(),
					isMovable:false,
				};
				
				A.children.push( support );
				supports.push( support );
			}
			
			// NOTE:
			// Массив линий, описывающих прямоугольник -> [ [ A, B ], [ D, C ] ]
			// Далее в цикле, для каждую B = vSupports[ b ] добавляем в массив препоследним элементом [ B ] - этого хватит чтобы разделить прямоугольник на части
			// После цикла, на основе линий, создаётся массив из трех точек описывайщий каждый из прямоугольников
			
			const lines = 
			[ 
				[ this._getPoint( 'A' ), this._getPoint( 'B' ) ],
				[ this._getPoint( 'D' ), this._getPoint( 'C' ) ]
			];
			
			// для всех vSupports пересечение с DA
			for( let b = 0; b < vSupports.length; b++ )
			{
				const B = vSupports[ b ];
				const line = this._getLine( 'DA' );
				const hasWall = line.hasWall && this._wallMaterial !== WALL_MATERIAL_OTHER;
				const intersection = getLinesIntersection
				( 
					B.position.x, B.position.y,
					B.ray.x, B.ray.y,
					line.start.position.x, line.start.position.y,
					line.end.position.x, line.end.position.y,
				);
				
				const supportName = B.name + '-o'; // opposite
				const jsonSupport = getJSONSupport( supportName );
				const support = 
				{ 
					name:supportName, 
					uuid:MathUtils.generateUUID(),
					lineFrom:line,
					type:jsonSupport ? jsonSupport.type : ( hasWall ? SUPPORT_TYPE_WALL_MOUNT : SUPPORT_TYPE_POST ),
					height:jsonSupport ? jsonSupport.height : this._elevation,
					position:intersection.point.clone().addScaledVector( line.normal, -SUPPORT_RADIUS ),
					edgePosition:intersection.point.clone(),
					normal:line.normal.clone(),
					isMovable:false,
				};
				
				B.children.push( support );
				supports.push( support );
				
				// BEAM_START
				
				// Для подвижных опор, указываем A и B опоры, чтобы можно было пересчитать точки
				// Для статики будут только точки

					const beam = 
					{
						uuid:MathUtils.generateUUID(),
						A:B,
						B:support,
						isFirst:true
					};
					
					this._updateBeam( beam );

					beams.push( beam );
					
					const beam2 = 
					{
						uuid:MathUtils.generateUUID(),
						A:B,
						B:support,
						isFirst:false
					};
					
					this._updateBeam( beam2 );

					beams.push( beam2 );
					
				// BEAM_END
				
				// RECT_START
				
				lines.splice( lines.length - 1, 0, [ support, B ] );
				
				// RECT_END
			}

			for( let i = 0; i < lines.length - 1; i++ )
			{
				sectors.push( { lines, points:[ lines[ i ][ 0 ], lines[ i ][ 1 ], lines[ i + 1 ][ 0 ] ] } );
			}
			
			this._sectorLines = lines;
		}
		else if( this._isLShaped )
		{
			// Сдвигаем на ширину опоры, тут только для C
			supports.find( support => support.name === 'C' ).position.addScaledVector( this._getLine( 'BC' ).normal, SUPPORT_RADIUS * 2 );

			if( this._getLineLength( 'FA' ) >= 3000 )
			{
				_addIntersectionSupport( 'FA', 'CD' );
			}

			[ 'CD', 'EF' ].forEach( name => _addIntermidiateSupports( name ) );
			
			// BEAM_START
			
				const C = this._getPoint( 'C' );
				const BC = this._getLine( 'BC' );
				const FA = this._getLine( 'FA' );
				const ray = C.position.clone().addScaledVector( BC.normal, -MAX_LINE_LENGTH );
				const intersection = getLinesIntersection
				( 
					C.position.x, C.position.y,
					ray.x, ray.y,
					FA.start.position.x, FA.start.position.y,
					FA.end.position.x, FA.end.position.y,
				);
				
				const p1 = C.position.clone().addScaledVector( BC.normal, -BOTTOM_BORDER_THICKNESS );
				const p2 = p1.clone().addScaledVector( BC.direction, BOTTOM_BORDER_THICKNESS );
				const p4 = intersection.point.clone().addScaledVector( BC.normal, BOTTOM_BORDER_THICKNESS );
				const p3 = p4.clone().addScaledVector( BC.direction, BOTTOM_BORDER_THICKNESS );
				const p12 = C.position.clone().addScaledVector( BC.normal, -TOP_BORDER_THICKNESS );
				const p22 = p12.clone().addScaledVector( BC.direction, TOP_BORDER_THICKNESS );
				const p42 = intersection.point.clone().addScaledVector( BC.normal, TOP_BORDER_THICKNESS );
				const p32 = p42.clone().addScaledVector( BC.direction, TOP_BORDER_THICKNESS );

				beams.push
				( { 
					uuid:MathUtils.generateUUID(), 
					points:[ p1, p2, p3, p4 ], 
					points2:[ p12, p22, p32, p42 ] 
				} );
				
				beams.push
				( { 
					uuid:MathUtils.generateUUID(), 
					points:
					[ 
						p1.clone().addScaledVector( BC.direction, -BEAM_WIDTH - 2 ), 
						p2.clone().addScaledVector( BC.direction, -BEAM_WIDTH - 2 ), 
						p3.clone().addScaledVector( BC.direction, -BEAM_WIDTH - 2 ), 
						p4.clone().addScaledVector( BC.direction, -BEAM_WIDTH - 2 ) 
					],
					points2:
					[
						p12.clone().addScaledVector( BC.direction, -TOP_BORDER_THICKNESS - 2 ), 
						p22.clone().addScaledVector( BC.direction, -TOP_BORDER_THICKNESS - 2 ), 
						p32.clone().addScaledVector( BC.direction, -TOP_BORDER_THICKNESS - 2 ), 
						p42.clone().addScaledVector( BC.direction, -TOP_BORDER_THICKNESS - 2 )
					]
				} );
			
			
			// BEAM_END
			
			// RECT_START
			
			sectors.push( { follower:true, points:[ this._getPoint( 'A' ).position, this._getPoint( 'B' ).position, this._getPoint( 'C' ).position ] } );
			sectors.push( { leader:true, points:[ this._getPoint( 'D' ).position, this._getPoint( 'E' ).position, this._getPoint( 'F' ).position ] } );
			
			// RECT_END
		}
		else if( this._isSShaped )
		{
			// Сдвигаем на ширину опоры, тут только для C и G
			supports.find( support => support.name === 'C' ).position.addScaledVector( this._getLine( 'BC' ).normal, SUPPORT_RADIUS * 2 );
			supports.find( support => support.name === 'G' ).position.addScaledVector( this._getLine( 'FG' ).normal, SUPPORT_RADIUS * 2 );
			
			_addIntersectionSupport( 'DE', 'GH' );
			_addIntersectionSupport( 'HA', 'CD' );
			
			[ 'CD', 'GH' ].forEach( name => _addIntermidiateSupports( name ) );		
			[ [ 'BC', 'HA' ], [ 'FG', 'DE' ] ].forEach( ( [ name1, name2 ] ) => _addOppositeSupports( name1, name2, _addIntermidiateSupports( name1 ) ) );
			
			// BEAM_START
			
				const C = this._getPoint( 'C' );
				const BC = this._getLine( 'BC' );
				const HA = this._getLine( 'HA' );
				const ray = C.position.clone().addScaledVector( BC.normal, -MAX_LINE_LENGTH );
				const intersection = getLinesIntersection
				( 
					C.position.x, C.position.y,
					ray.x, ray.y,
					HA.start.position.x, HA.start.position.y,
					HA.end.position.x, HA.end.position.y,
				);
				
				const p1 = C.position.clone().addScaledVector( BC.normal, -BOTTOM_BORDER_THICKNESS );
				const p2 = p1.clone().addScaledVector( BC.direction, BOTTOM_BORDER_THICKNESS );
				const p4 = intersection.point.clone().addScaledVector( BC.normal, BOTTOM_BORDER_THICKNESS );
				const p3 = p4.clone().addScaledVector( BC.direction, BOTTOM_BORDER_THICKNESS );
				const p12 = C.position.clone().addScaledVector( BC.normal, -TOP_BORDER_THICKNESS );
				const p22 = p12.clone().addScaledVector( BC.direction, TOP_BORDER_THICKNESS );
				const p42 = intersection.point.clone().addScaledVector( BC.normal, TOP_BORDER_THICKNESS );
				const p32 = p42.clone().addScaledVector( BC.direction, TOP_BORDER_THICKNESS );

				beams.push
				( { 
					uuid:MathUtils.generateUUID(), 
					points:[ p1, p2, p3, p4 ], 
					points2:[ p12, p22, p32, p42 ] 
				} );
				
				beams.push
				( { 
					uuid:MathUtils.generateUUID(), 
					points:
					[ 
						p1.clone().addScaledVector( BC.direction, -BEAM_WIDTH - 2 ), 
						p2.clone().addScaledVector( BC.direction, -BEAM_WIDTH - 2 ), 
						p3.clone().addScaledVector( BC.direction, -BEAM_WIDTH - 2 ), 
						p4.clone().addScaledVector( BC.direction, -BEAM_WIDTH - 2 ) 
					],
					points2:
					[
						p12.clone().addScaledVector( BC.direction, -TOP_BORDER_THICKNESS - 2 ), 
						p22.clone().addScaledVector( BC.direction, -TOP_BORDER_THICKNESS - 2 ), 
						p32.clone().addScaledVector( BC.direction, -TOP_BORDER_THICKNESS - 2 ), 
						p42.clone().addScaledVector( BC.direction, -TOP_BORDER_THICKNESS - 2 )
					]
				} );
				
				const G = this._getPoint( 'G' );
				const FG = this._getLine( 'FG' );
				const DE = this._getLine( 'DE' );
				const ray2 = G.position.clone().addScaledVector( FG.normal, -MAX_LINE_LENGTH );
				const intersection2 = getLinesIntersection
				( 
					G.position.x, G.position.y,
					ray2.x, ray2.y,
					DE.start.position.x, DE.start.position.y,
					DE.end.position.x, DE.end.position.y,
				);
				
				const p5 = G.position.clone().addScaledVector( FG.normal, -BOTTOM_BORDER_THICKNESS );
				const p6 = p5.clone().addScaledVector( FG.direction, BOTTOM_BORDER_THICKNESS );
				const p7 = intersection2.point.clone().addScaledVector( FG.normal, BOTTOM_BORDER_THICKNESS );
				const p8 = p7.clone().addScaledVector( FG.direction, BOTTOM_BORDER_THICKNESS );
				const p52 = G.position.clone().addScaledVector( FG.normal, -TOP_BORDER_THICKNESS );
				const p62 = p52.clone().addScaledVector( FG.direction, TOP_BORDER_THICKNESS );
				const p72 = intersection2.point.clone().addScaledVector( FG.normal, TOP_BORDER_THICKNESS );
				const p82 = p72.clone().addScaledVector( FG.direction, TOP_BORDER_THICKNESS );
				
				beams.push
				( { 
					uuid:MathUtils.generateUUID(), 
					points:[ p5, p6, p8, p7 ], 
					points2:[ p52, p62, p82, p72 ] 
				} );

				beams.push
				( { 
					uuid:MathUtils.generateUUID(), 
					points:
					[ 
						p5.clone().addScaledVector( FG.direction, -BEAM_WIDTH - 2 ), 
						p6.clone().addScaledVector( FG.direction, -BEAM_WIDTH - 2 ), 
						p8.clone().addScaledVector( FG.direction, -BEAM_WIDTH - 2 ), 
						p7.clone().addScaledVector( FG.direction, -BEAM_WIDTH - 2 ) 
					],
					points2:
					[
						p52.clone().addScaledVector( FG.direction, -TOP_BORDER_THICKNESS - 2 ), 
						p62.clone().addScaledVector( FG.direction, -TOP_BORDER_THICKNESS - 2 ), 
						p82.clone().addScaledVector( FG.direction, -TOP_BORDER_THICKNESS - 2 ), 
						p72.clone().addScaledVector( FG.direction, -TOP_BORDER_THICKNESS - 2 )
					]
				} );

			// BEAM_END
			
			// RECT_START
			
			sectors.push( { follower:true, points:[ this._getPoint( 'A' ).position, this._getPoint( 'B' ).position, this._getPoint( 'C' ).position ] } );
			sectors.push( { leader:true, points:[ this._getPoint( 'D' ).position, this._getPoint( 'H' ).position ] } );
			sectors.push( { follower:true, points:[ this._getPoint( 'E' ).position, this._getPoint( 'F' ).position, this._getPoint( 'G' ).position ] } );
			
			// RECT_END
		}
		else if( this._isUShaped )
		{
			// Сдвигаем на ширину опоры, тут только для C и D
			supports.find( support => support.name === 'C' ).position.addScaledVector( this._getLine( 'BC' ).normal, SUPPORT_RADIUS * 2 );
			supports.find( support => support.name === 'D' ).position.addScaledVector( this._getLine( 'DE' ).normal, SUPPORT_RADIUS * 2 );
			
			_addIntersectionSupport( 'FG', 'CD' );
			_addIntersectionSupport( 'HA', 'CD' );
			
			if( this._getLineLength( 'GH' ) > 8000 )
			{
				_addIntersectionSupport( 'GH', 'BC' );
				_addIntersectionSupport( 'GH', 'DE' );
			}
			else 
			{
				_addIntermidiateSupports( 'GH' );
			}
			
			[ [ 'BC', 'HA' ], [ 'DE', 'FG' ] ].forEach( ( [ name1, name2 ] ) => _addOppositeSupports( name1, name2, _addIntermidiateSupports( name1 ) ) );
			
			// BEAM_START
			
				const C = this._getPoint( 'C' );
				const BC = this._getLine( 'BC' );
				const HA = this._getLine( 'HA' );
				const ray = C.position.clone().addScaledVector( BC.normal, -MAX_LINE_LENGTH );
				const intersection = getLinesIntersection
				( 
					C.position.x, C.position.y,
					ray.x, ray.y,
					HA.start.position.x, HA.start.position.y,
					HA.end.position.x, HA.end.position.y,
				);
				
				const p1 = C.position.clone().addScaledVector( BC.normal, -BOTTOM_BORDER_THICKNESS );
				const p2 = p1.clone().addScaledVector( BC.direction, BOTTOM_BORDER_THICKNESS );
				const p4 = intersection.point.clone().addScaledVector( BC.normal, BOTTOM_BORDER_THICKNESS );
				const p3 = p4.clone().addScaledVector( BC.direction, BOTTOM_BORDER_THICKNESS );
				const p12 = C.position.clone().addScaledVector( BC.normal, -TOP_BORDER_THICKNESS );
				const p22 = p12.clone().addScaledVector( BC.direction, TOP_BORDER_THICKNESS );
				const p42 = intersection.point.clone().addScaledVector( BC.normal, TOP_BORDER_THICKNESS );
				const p32 = p42.clone().addScaledVector( BC.direction, TOP_BORDER_THICKNESS );

				beams.push
				( { 
					uuid:MathUtils.generateUUID(), 
					points:[ p1, p2, p3, p4 ], 
					points2:[ p12, p22, p32, p42 ] 
				} );
				
				beams.push
				( { 
					uuid:MathUtils.generateUUID(), 
					points:
					[ 
						p1.clone().addScaledVector( BC.direction, -BEAM_WIDTH - 2 ), 
						p2.clone().addScaledVector( BC.direction, -BEAM_WIDTH - 2 ), 
						p3.clone().addScaledVector( BC.direction, -BEAM_WIDTH - 2 ), 
						p4.clone().addScaledVector( BC.direction, -BEAM_WIDTH - 2 ) 
					],
					points2:
					[
						p12.clone().addScaledVector( BC.direction, -TOP_BORDER_THICKNESS - 2 ), 
						p22.clone().addScaledVector( BC.direction, -TOP_BORDER_THICKNESS - 2 ), 
						p32.clone().addScaledVector( BC.direction, -TOP_BORDER_THICKNESS - 2 ), 
						p42.clone().addScaledVector( BC.direction, -TOP_BORDER_THICKNESS - 2 )
					]
				} );
				
				const D = this._getPoint( 'D' );
				const DE = this._getLine( 'DE' );
				const FG = this._getLine( 'FG' );
				const ray2 = D.position.clone().addScaledVector( DE.normal, -MAX_LINE_LENGTH );
				const intersection2 = getLinesIntersection
				( 
					D.position.x, D.position.y,
					ray2.x, ray2.y,
					FG.start.position.x, FG.start.position.y,
					FG.end.position.x, FG.end.position.y,
				);
				
				const p5 = D.position.clone().addScaledVector( DE.normal, -BOTTOM_BORDER_THICKNESS );
				const p6 = p5.clone().addScaledVector( DE.direction, -BOTTOM_BORDER_THICKNESS );
				const p7 = intersection2.point.clone().addScaledVector( DE.normal, BOTTOM_BORDER_THICKNESS );
				const p8 = p7.clone().addScaledVector( DE.direction, -BOTTOM_BORDER_THICKNESS );
				
				const p52 = D.position.clone().addScaledVector( DE.normal, -TOP_BORDER_THICKNESS );
				const p62 = p52.clone().addScaledVector( DE.direction, -TOP_BORDER_THICKNESS );
				const p72 = intersection2.point.clone().addScaledVector( DE.normal, TOP_BORDER_THICKNESS );
				const p82 = p72.clone().addScaledVector( DE.direction, -TOP_BORDER_THICKNESS );
				
				beams.push
				( { 
					uuid:MathUtils.generateUUID(), 
					points:[ p5, p6, p8, p7 ], 
					points2:[ p52, p62, p82, p72 ] 
				} );

				beams.push
				( { 
					uuid:MathUtils.generateUUID(), 
					points:
					[ 
						p5.clone().addScaledVector( DE.direction, BEAM_WIDTH + 2 ), 
						p6.clone().addScaledVector( DE.direction, BEAM_WIDTH + 2 ), 
						p8.clone().addScaledVector( DE.direction, BEAM_WIDTH + 2 ), 
						p7.clone().addScaledVector( DE.direction, BEAM_WIDTH + 2 ) 
					],
					points2:
					[
						p52.clone().addScaledVector( DE.direction, TOP_BORDER_THICKNESS + 2 ), 
						p62.clone().addScaledVector( DE.direction, TOP_BORDER_THICKNESS + 2 ), 
						p82.clone().addScaledVector( DE.direction, TOP_BORDER_THICKNESS + 2 ), 
						p72.clone().addScaledVector( DE.direction, TOP_BORDER_THICKNESS + 2 )
					]
				} );


			// BEAM_END
			
			// RECT_START
			
			sectors.push( { follower:true, points:[ this._getPoint( 'A' ).position, this._getPoint( 'B' ).position, this._getPoint( 'C' ).position ] } );
			sectors.push( { follower:true, points:[ this._getPoint( 'D' ).position, this._getPoint( 'E' ).position, this._getPoint( 'F' ).position ] } );
			sectors.push( { leader:true, points:[ this._getPoint( 'C' ).position, this._getPoint( 'G' ).position, this._getPoint( 'H' ).position ] } );
			
			// RECT_END
		}
			
		//
		
		supports.sort( ( a, b ) =>
		{
			if( a.position.y < b.position.y ) return -1;
			else if( a.position.y > b.position.y ) return 1;
			else return a.position.x < b.position.x ? -1 : 1;
		} );
		
		supports.forEach( ( support, index ) => support.displayName = ( index + 1 ).toString() );
		
		//
		
		supports.forEach( support =>
		{
			if( support.isMovable )
			{		 
				const { prevName, nextName, lineFrom, axis, normal } = support;
				const prevSupport = supports.find( support => support.name === prevName );
				const nextSupport = supports.find( support => support.name === nextName );
				const prevDistanceName = prevSupport.displayName + '=' + support.displayName;
				const nextDistanceName = support.displayName + '=' + nextSupport.displayName;
				
				if( distancesBetweenSupports.find( distance => distance.name === prevDistanceName ) == null )
				{
					distancesBetweenSupports.push
					( {
						uuid:MathUtils.generateUUID(),
						name:prevDistanceName,
						normal,
						line:lineFrom,
						axis,
						support1:prevSupport,
						support2:support,
					} );
				}
				
				if( distancesBetweenSupports.find( distance => distance.name === nextDistanceName ) == null )
				{
					distancesBetweenSupports.push
					( {
						uuid:MathUtils.generateUUID(),
						name:nextDistanceName,
						normal,
						line:lineFrom,
						axis,
						support1:support,
						support2:nextSupport,
					} );
				}
			}
		} );
		
		//

		let leader = null;
		
		sectors.forEach( sector =>
		{
			const box = new Box2();
			
			sector.points.forEach( point => 
			{
				let position;
				
				if( point instanceof Vector2 )
				{
					position = point;
				}
				else if( point.edgePosition )
				{
					position = point.edgePosition;
				}
				else if( point.position )
				{
					position = point.position;
				}
				
				box.expandByPoint( position )
			} );
			
			sector.box = box;
			
			const size = box.getSize( new Vector2() );
			const width = size.x;
			const height = size.y;
			const maxSize = Math.max( width, height );
			
			Object.assign( sector, { maxSize, width, height, x:box.min.x, y:box.min.y } );
			
			if( sector.leader )
			{
				leader = sector;
			}
		} );
		
		this._sectors = [];
		
		sectors.forEach( sector =>
		{
			const { box, maxSize, x, y, width, height } = sector;
			
			let direction = height > width ? 'h' : 'v';
			
			if( leader )
			{
				if( leader !== sector && maxSize <= 4000 )
				{
					direction = leader.height > leader.width ? 'h' : 'v';
				}						
			}
			
			this._sectors.push( { box, x, y, width, height, direction } );
		} );

		this._beams = beams;
		this._supports = supports;
		this._distancesBetweenSupports = distancesBetweenSupports;
		this._supportsVersion++;
		
		this._computeTravers2();

		// console.log( supports );	
		// console.log( this._beams );
		// console.log( this._sectors ); 

		this.dispatchEvent( { type:'supportsRecomputed' } );
	}
	
	_computeTravers2( needsRecomputeSectors = false )
	{
		if( needsRecomputeSectors && Array.isArray( this._sectorLines ) ) // Только для прямоугольной формы!
		{
			const lines = this._sectorLines;
			const sectors = [];

			for( let i = 0; i < lines.length - 1; i++ )
			{
				sectors.push( { points:[ lines[ i ][ 0 ], lines[ i ][ 1 ], lines[ i + 1 ][ 0 ] ] } );
			}
			
			this._sectors = [];

			sectors.forEach( sector =>
			{
				const box = new Box2();
				
				sector.points.forEach( point => 
				{
					let position;
					
					if( point instanceof Vector2 )
					{
						position = point;
					}
					else if( point.edgePosition )
					{
						position = point.edgePosition;
					}
					else if( point.position )
					{
						position = point.position;
					}
					
					box.expandByPoint( position )
				} );

				const size = box.getSize( new Vector2() );
				const width = size.x;
				const height = size.y;
				const maxSize = Math.max( width, height );

				this._sectors.push
				( { 
					box, 
					x:box.min.x, 
					y:box.min.y, 
					width, 
					height, 
					direction:height > width ? 'h' : 'v' 
				} );
			} );
		}
		
		//
		
		const median = ( ... numbers ) => 
		{
			const sorted = [ ... numbers ].sort( ( a, b ) => a - b );
			const mid = Math.floor( sorted.length / 2 );

			return ( sorted.length % 2 === 1 ) ? sorted[ mid ] : ( sorted[ mid - 1 ] + sorted[ mid ] ) / 2;
		};
		
		// Траверсы
		/*	
			C=A-800
			D=MAX(0;INT((C-500)/950))+IF(C-950*INT((C-500)/950)>1000;1;0)
			E=MAX(900;MIN(950;MIN((C-500)/D;MAX((C-1000)/D;MEDIAN(900;(C-750)/D;950)))))
		*/
		
		this._traverses = [];
		
		// Омега!
		/*
			A = короткая сторона; // - TOP_BORDER_THICKNESS * 2
			B = 2 * 225
			C = A - B;
			D = INT( C / 500 )
			E = C / ( D + 1 )
		*/
		this._counterTraverses = []; 

		this._sectors.forEach( sector =>
		{
			const { box, x, y, width, height, direction } = sector;

			// Траверсы
			{
				const normal = ( direction === 'v' ) ? new Vector2( 1, 0 ) : new Vector2( 0, 1 );
				const A = ( direction === 'v' ) ? width : height; // Полная длина
				const B = 800; // Фиксированный отступ для боковых траверсов 400 + 400
				const C = A - B; // Остаток длины
				const D = ( () => // количество траверсов
				{
					const value = Math.max( 0, Math.floor( ( C - 500 ) / 950 ) );		
					return ( C - 950 * Math.floor( ( C - 500 ) / 950 ) > 1000 ) ? value + 1 : value;
					
				} )();

				const E = Math.max // расстояние между траверсами
				( 
					900, 
					Math.min
					( 
						950, 
						Math.min
						( 
							( C - 500 ) / D, 
							Math.max
							( 
								( C - 1000 ) / D,
								median( 900, ( C - 750 ) / D, 950 )
							) 
						)					
					) 
				);
				
				const F = C - ( D - 1 ) * E;
				const G = F / 2;

				let count = 0;
				let offset = 0;
				let spacing = 0;

				if( A >= 1800 )
				{
					count = D;
					offset = G + 400;
					spacing = E;
				}

				const lines = [];

				if( direction == 'h' )
				{
					lines.push
					( [ 
						new Vector2( x + TOP_BORDER_THICKNESS, y + 400 ), 
						new Vector2( x + width - TOP_BORDER_THICKNESS, y + 400 ) 
					] );

					for( let i = 0; i < count; i++ )
					{
						lines.push
						( [ 
							new Vector2( x + TOP_BORDER_THICKNESS, y + offset + spacing * i ), 
							new Vector2( x + width - TOP_BORDER_THICKNESS, y + offset + spacing * i ) 
						] );
					}
					
					lines.push
					( [ 
						new Vector2( x + TOP_BORDER_THICKNESS, y + height - 400 ), 
						new Vector2( x + width - TOP_BORDER_THICKNESS, y + height - 400 ) 
					] );
				}
				else 
				{
					lines.push
					( [ 
						new Vector2( x + 400, y + TOP_BORDER_THICKNESS ), 
						new Vector2( x + 400, y + height - TOP_BORDER_THICKNESS ) 
					] );

					for( let i = 0; i < count; i++ )
					{
						lines.push
						( [ 
							new Vector2( x + offset + spacing * i, y + TOP_BORDER_THICKNESS ), 
							new Vector2( x + offset + spacing * i, y + height - TOP_BORDER_THICKNESS ) 
						] );
					}
					
					lines.push
					( [ 
						new Vector2( x + width - 400, y + TOP_BORDER_THICKNESS ), 
						new Vector2( x + width - 400, y + height - TOP_BORDER_THICKNESS ) 
					] );
				}
				
				lines.forEach( ( line, index, array ) =>
				{
					const first = ( index === 0 );
					const last = ( index === array.length - 1 );
					const min = first ? -TRAVERSE_WIDTH : ( last ? 0 : -TRAVERSE_WIDTH / 2 );
					const max = first ? 0 : ( last ? TRAVERSE_WIDTH : TRAVERSE_WIDTH / 2 );
					
					this._traverses.push
					( [
						line[ 0 ].clone().addScaledVector( normal, min ),
						line[ 0 ].clone().addScaledVector( normal, max ),
						line[ 1 ].clone().addScaledVector( normal, max ),
						line[ 1 ].clone().addScaledVector( normal, min ),
					] );
				} );
				
				sector.traverses =
				{
					lines,
					spacing,
				};	
			}			
		
		
			// Омега
			{
				const normal = ( direction === 'h' ) ? new Vector2( 1, 0 ) : new Vector2( 0, 1 );
				const A = ( direction === 'v' ) ? height : width; // Короткая сторона
				const B = 450;
				const C = A - B;
				const D = Math.floor( C / 500 );
				const E = C / ( D + 1 );
				
				let count = D;
				let offset = E + 225;
				let spacing = E;
				
				const lines = [];
				
				if( direction == 'v' )
				{
					lines.push
					( [ 
						new Vector2( x + TOP_BORDER_THICKNESS, y + 225 ), 
						new Vector2( x + width - TOP_BORDER_THICKNESS, y + 225 ) 
					] );

					for( let i = 0; i < count; i++ )
					{
						lines.push
						( [ 
							new Vector2( x + TOP_BORDER_THICKNESS, y + offset + spacing * i ), 
							new Vector2( x + width - TOP_BORDER_THICKNESS, y + offset + spacing * i ) 
						] );
					}
					
					lines.push
					( [ 
						new Vector2( x + TOP_BORDER_THICKNESS, y + height - 225 ), 
						new Vector2( x + width - TOP_BORDER_THICKNESS, y + height - 225 ) 
					] );
				}
				else 
				{
					lines.push
					( [ 
						new Vector2( x + 225, y + TOP_BORDER_THICKNESS ), 
						new Vector2( x + 225, y + height - TOP_BORDER_THICKNESS ) 
					] );

					for( let i = 0; i < count; i++ )
					{
						lines.push
						( [ 
							new Vector2( x + offset + spacing * i, y + TOP_BORDER_THICKNESS ), 
							new Vector2( x + offset + spacing * i, y + height - TOP_BORDER_THICKNESS ) 
						] );
					}
					
					lines.push
					( [ 
						new Vector2( x + width - 225, y + TOP_BORDER_THICKNESS ), 
						new Vector2( x + width - 225, y + height - TOP_BORDER_THICKNESS ) 
					] );
				}
				
				lines.forEach( ( line, index, array ) =>
				{
					const first = ( index === 0 );
					const last = ( index === array.length - 1 );
					//const min = -COUNTER_TRAVERSE_WIDTH / 2;
					//const max = COUNTER_TRAVERSE_WIDTH / 2;
					const min = first ? -COUNTER_TRAVERSE_WIDTH : ( last ? 0 : -COUNTER_TRAVERSE_WIDTH / 2 );
					const max = first ? 0 : ( last ? COUNTER_TRAVERSE_WIDTH : COUNTER_TRAVERSE_WIDTH / 2 );
					
					this._counterTraverses.push
					( [
						line[ 0 ].clone().addScaledVector( normal, min ),
						line[ 0 ].clone().addScaledVector( normal, max ),
						line[ 1 ].clone().addScaledVector( normal, max ),
						line[ 1 ].clone().addScaledVector( normal, min ),
					] );
				} );
				
				sector.counterTraverses =
				{
					lines,
					spacing,
				};
			}
		} );
		

		this.dispatchEvent( { type:'traversesRecomputed' } );
	}
		
	_updateSupports()
	{
		console.log( '_updateSupports' );
		
		this._supports.forEach( support =>
		{
			const { uuid, type, lineFrom, lineTo } = support;
			const hasWall = lineFrom?.hasWall || lineTo?.hasWall;
			
			if( type === SUPPORT_TYPE_WALL_MOUNT )
			{
				if( !hasWall || ( hasWall && this._wallMaterial === WALL_MATERIAL_OTHER ) )
				{
					support.type = SUPPORT_TYPE_POST;
					
					this.dispatchEvent( { type:'supportTypeChanged', uuid } );
				}
			}
			else if( type == SUPPORT_TYPE_POST )
			{
				if( hasWall && this._wallMaterial !== WALL_MATERIAL_OTHER )
				{
					support.type = SUPPORT_TYPE_WALL_MOUNT;
					
					this.dispatchEvent( { type:'supportTypeChanged', uuid } );
				}
			}				
		} );
	}


	_getPoint( name, source = null ) 
	{
		return ( source ?? this._points ).find( point => point.name == name );
	}
	
	_getLine( name, source = null )
	{
		return ( source ?? this._lines ).find( line => line.name == name );
	}
	
	_getLineToPoint( point, source = null )
	{
		return ( source ?? this._lines ).find( line => line.end === point );
	}
	
	_getLineFromPoint( point, source = null )
	{
		return ( source ?? this._lines ).find( line => line.start === point );
	}
		
	_getLineLength( name, source = null )
	{
		const { start, end } = this._getLine( name, source );
		const length = start.position.distanceTo( end.position );

		return Math.round( length );
	}
	
	_clone()
	{
		const points = [];
		const lines = [];

		this._points.forEach( point =>
		{
			const { name, position } = point;
			
			points.push( { name, position:position.clone() } );
		} );
		
		this._lines.forEach( line => 
		{
			const { name, start, end, direction, normal, inputable, minLength, maxLength } = line;
			
			lines.push
			( {
				name,
				start:points.find( point => point.name === start.name  ),
				end:points.find( point => point.name === end.name ),
				direction:direction.clone(),
				normal:normal.clone(),
				inputable, 
				minLength, 
				maxLength,
			} );
		} );
		
		return { points, lines };
	}
	
	_getError( lines2 )
	{
		for( let i = 0; i < lines2.length; i++ )
		{
			const line2 = lines2[ i ];
			const length2 = Math.round( new Vector2().subVectors( line2.end.position, line2.start.position ).length() );
			const direction2 = new Vector2().subVectors( line2.end.position, line2.start.position ).normalize().round();
			const line = this._getLine( line2.name );

			if( length2 < line2.minLength )
			{
				//console.warn( 'LINE_MIN_LENGTH_ERROR', line2.name, length2, line2.minLength );
				return LINE_MIN_LENGTH_ERROR;
			} 
			 
			if( length2 > line2.maxLength )
			{
				//console.warn( 'LINE_MAX_LENGTH_ERROR', line2.name, length2, line2.maxLength );
				return LINE_MAX_LENGTH_ERROR;
			}
			 
			if( !direction2.equals( line.direction ) )
			{
				//console.log( 'LINE_DIRECTION_ERROR', direction2.x + ',' + direction2.y + ' = ' + line.direction.x + ',' + line.direction.y );
				return LINE_DIRECTION_ERROR;
			}
		}
		
		// Распорки
		for( let i = 0; i < this._spacers.length; i++ )
		{
			const { a, b, minLength, maxLength, aNormalIntersectsB } = this._spacers[ i ];
			const line1 = this._getLine( a, lines2 ); // line1
			const line2 = this._getLine( b, lines2 ); // line2		
			const { x, y } = line1.start.position;
			const { x:x1, y:y1 } = line2.start.position;
			const { x:x2, y:y2 } = line2.end.position;	
			const { distance } = getProjectedPointOnLine( x, y, x1, y1, x2, y2 );
			
			if( distance < minLength )
			{
				// console.warn( 'SPACER_MIN_LENGTH_ERROR [ ' + a + '-' + b + ' ]' );
				return SPACER_MIN_LENGTH_ERROR;
			} 

			if( distance > maxLength )
			{
				// console.warn( 'SPACER_MAX_LENGTH_ERROR [ ' + a + '-' + b + ' ]' );
				return SPACER_MAX_LENGTH_ERROR;
			}
			
			// Не должны меняться местами!
			const intersection = getLinesIntersection
			(
				x, y,
				x + MAX_LINE_LENGTH * line1.normal.x, y + MAX_LINE_LENGTH * line1.normal.y,
				x1 - MAX_LINE_LENGTH * line2.direction.x, y1 - MAX_LINE_LENGTH * line2.direction.y,
				x2 + MAX_LINE_LENGTH * line2.direction.x, y2 + MAX_LINE_LENGTH * line2.direction.y,
			)
			
			if( aNormalIntersectsB != intersection.isOnLine )
			{
				//console.warn( 'SPACER_POSITION_ERROR [ ' + a + '-' + b + ' ]' );
				return SPACER_POSITION_ERROR;
			}
		}
		
		for( let i = 0; i < lines2.length - 1; i++ )
		{
			for( let a = i + 1; a < lines2.length; a++ )
			{
				const line1 = lines2[ i ];
				const line2 = lines2[ a ];
				const intersect = isIntersect
				(
					line1.start.position.x,
					line1.start.position.y,
					line1.end.position.x,
					line1.end.position.y,
					line2.start.position.x,
					line2.start.position.y,
					line2.end.position.x,
					line2.end.position.y,
				);
				
				if( intersect )
				{
					//console.warn( 'LINE_POSITION_ERROR [ ' + line1.name + '-' + line2.name + ' ]' );
					return LINE_POSITION_ERROR;
				}
			}
		}

		return NO_ERROR;
	}
	
	
	center()
	{
		this._center();
		this._computeGeometry();
		this._computeSupports();
		this._computeDecking();
		
		this.dispatchEvent( { type:'change' } );		
	}
	
	/*getDeckingEnabled()
	{
		return this._deckingEnabled;
	}
	
	setDeckingEnabled( value )
	{
		value = !!value;
		
		if( this._deckingEnabled !== value )
		{
			this._deckingEnabled = value;
			this._computeDecking();
		}
	}*/
	
	getBottomDeckingEnabled()
	{
		return this._bottomDeckingEnabled;
	}
	
	setBottomDeckingEnabled( value )
	{
		value = !!value;
		
		if( this._bottomDeckingEnabled !== value )
		{
			this._bottomDeckingEnabled = value;
			this._computeDecking();
		}
	}
	
	getTraverses()
	{
		return this._traverses.map( shape => shape.map( point => point.clone() ) );
	}
	
	getCounterTraverses()
	{
		return this._counterTraverses.map( shape => shape.map( point => point.clone() ) );
	}
	
	getDeckingBoards()
	{
		if( this._deckingEnabled )
		{
			const decking = this._deckingBoards.map( board => 
			{ 
				return { 
					shapes:board.shapes.map( shape => shape.map( point => point.clone() ) ),
					hasError:board.hasError,
				}; 
			} );
			
			return decking;
		}
		
		return [];
	}
	
	getBottomDeckingBoards()
	{
		if( this._bottomDeckingEnabled )
		{
			const decking = this._bottomDeckingBoards.map( board => 
			{ 
				return { shapes:board.shapes.map( shape => shape.map( point => point.clone() ) ) }; 
			} );
				
			return decking;
		}
		
		return [];
	}
	
	getDeckingColor()
	{
		return this._deckingColor;
	}
	
	setDeckingColor( color )
	{
		this._deckingColor = color;
		this.dispatchEvent( { type:'deckingColorChanged' } );
	}		

	getDeckingOrientationList()
	{
		return [ ... this._deckingOrientationList ];
	}
	
	getDeckingOrientation()
	{
		return this._deckingOrientation;
	}

	setDeckingOrientation( orientation )
	{
		if( this._deckingOrientation != orientation && this._deckingOrientationList.includes( orientation ) )
		{
			this._deckingOrientation = orientation;
			
			this._computeGeometry();
			this._computeDecking();
		}	
	}
	
	getDeckingBoardWidth()
	{
		return this._deckingBoardWidth;
	}
	
	setDeckingBoardWidth( width )
	{
		if( this._deckingBoardWidth != width && DECKING_BOARD_WIDTHS.includes( width ) )
		{
			this._deckingBoardWidth = width;
			
			this._computeGeometry();
			this._computeDecking();
		}
	}

	
	/*getMaxDeckingOffsetX()
	{
		return this._maxDeckingOffsetX;
	}
	
	getMaxDeckingOffsetY()
	{
		return this._maxDeckingOffsetY;
	}
	
	getDeckingOffsetX()
	{
		return this._deckingOffsetX;
	}
	
	getDeckingOffsetY()
	{
		return this._deckingOffsetY;
	}
	
	setDeckingOffsetX( offsetX )
	{
		let hasError = true;
		
		if( Number.isInteger( offsetX ) && this._deckingOffsetX != offsetX && offsetX >= 0 && offsetX <= this.getMaxDeckingOffsetX() )
		{
			hasError = false;
			
			this._deckingOffsetX = offsetX;
			this._computeDecking();
		}
	}
	
	setDeckingOffsetY( offsetY )
	{
		let hasError = true;
		
		if( Number.isInteger( offsetY ) && this._deckingOffsetY != offsetY && offsetY >= 0 && offsetY <= this.getMaxDeckingOffsetY() )
		{
			hasError = false;
			
			this._deckingOffsetY = offsetY;
			this._computeDecking();	
		}
	}*/
	
	getWallMaterial()
	{
		return this._wallMaterial;
	}
	
	setWallMaterial( material )
	{
		if( this._wallMaterial != material && WALL_MATERIALS.includes( material ) )
		{
			this._wallMaterial = material;
			this.dispatchEvent( { type:'wallMaterialChanged' } );
			
			this._updateSupports();
		}
	}		
	
	canRotate()
	{
		return this._canRotate;
	}
	
	canFlipX()
	{
		return this._canFlipX;
	}
	
	canFlipY()
	{
		return false;
	}
	
	rotate()
	{
		if( !this._canRotate )
		{
			return;
		}
		
		this._rotation = Math.round( ( this._rotation + 90 ) % 360 );
		
		const zero = new Vector2();
		const center = this._getCenter();
		const angle = Math.PI / 2;
		
		this._points.forEach( point => point.position.rotateAround( center, angle ).round() );		
		this._lines.forEach( line =>
		{
			line.direction.rotateAround( zero, angle ).round();
			line.normal.rotateAround( zero, angle ).round();
		} );
		
		this._center();
		this._computeGeometry();
		this._computeSupports();
		this._computeDecking();
		
		this.dispatchEvent( { type:'change' } );
	}
	
	flipX()
	{
		if( !this._canFlipX )
		{
			return;
		}

		this._points.forEach( point => point.position.x *= -1 );	
		this._lines.forEach( line =>
		{
			line.direction.x *= -1;
			line.normal.x *= -1;
		} );

		this._center();
		this._computeGeometry()
		this._computeSupports();
		this._computeDecking();

		this.dispatchEvent( { type:'change' } );
	}
	
	/*flipY()
	{
	}*/
	
	getMinLineLength( name )
	{
		const line = this._getLine( name );

		return line ? line.minLength : MIN_LINE_LENGTH;
	}
	
	getMaxLineLength( name )
	{
		const line = this._getLine( name );

		return line ? line.maxLength : MAX_LINE_LENGTH;
	}
	
	getLineLength( name )
	{
		return this._getLineLength( name );
	}
	
	_setLineLength( name, length )
	{
		const line = this._getLine( name );
			
		let error = null;
		let hasError = false;
		
		if( line && Number.isFinite( length ) )
		{
			length = Math.min( line.maxLength, Math.max( line.minLength, Math.round( length ) ) );
			
			const { points:points2, lines:lines2 } = this._clone();
			const line2 = this._getLine( name, lines2 );
			const { end, direction } = line2;
			const difference = length - this.getLineLength( name, lines2 );
			const { x:dx, y:dy } = direction;
			const { x:ex, y:ey } = end.position;

			points2.forEach( point =>
			{
				const { x, y } = point.position;
				
				if( dx > 0 && x >= ex )
					point.position.x += difference;

				if( dx < 0 && x <= ex )
					point.position.x -= difference;
	
				if( dy > 0 && y >= ey )
					point.position.y += difference;

				if( dy < 0 && y <= ey)
					point.position.y -= difference;

			} );
			
			error = this._getError( lines2 );
			hasError = error !== NO_ERROR;
			
			// console.log( dx, dy, error );
			
			if( !hasError )
			{	
				points2.forEach( point => this._getPoint( point.name ).position.copy( point.position ) );
			}
		}
		else 
		{
			hasError = true;
		}
		
		return hasError;
	}
	
	setLineLength( name, length )
	{
		const hasError = this._setLineLength( name, length );
		
		if( !hasError )
		{
			this._center();
			this._computeGeometry();
			this._computeSupports();
			this._computeDecking();
		}
		
		this.dispatchEvent( { type:'change', hasError } );
	}
	
	setLinePosition( name, newStartPosition, newEndPosition )
	{
		const line = this._getLine( name );
		
		let error = null;
		let hasError = false;
		
		if( line )
		{
			newStartPosition.round();
			newEndPosition.round();
	
			const { points:points2, lines:lines2 } = this._clone();
			const start2 = this._getPoint( line.start.name, points2 );
			const end2 = this._getPoint( line.end.name, points2 );
			const startTranslation = new Vector2().subVectors( newStartPosition, start2.position );
			const endTranslation = new Vector2().subVectors( newEndPosition, end2.position );
			const translationDirection = startTranslation.clone().normalize().round();

			if( !startTranslation.equals( endTranslation ) )
			{
				throw new Event( startTranslation, endTranslation );
			}
			
			if( startTranslation.x !== 0 && startTranslation.y !== 0 )
			{
				throw new Event( startTranslation );
			}

			start2.position.copy( newStartPosition );
			end2.position.copy( newEndPosition );
			
			const nextLine = this._getLineFromPoint( end2, lines2 );
			const nextLineLength = this._getLineLength( nextLine.name, lines2 );
			const nextLineIsHorizontal = Math.abs( nextLine.direction.x ) > Math.abs( nextLine.direction.y );
			
			//console.log( '---' );
			
			if( nextLineLength > nextLine.maxLength )
			{
				const difference = nextLineLength - nextLine.maxLength;
				
				if( nextLineIsHorizontal )
				{
					start2.position.x -= difference * -nextLine.direction.x;
					end2.position.x -= difference * -nextLine.direction.x;
				}
				else 
				{
					start2.position.y -= difference * -nextLine.direction.y;
					end2.position.y -= difference * -nextLine.direction.y;
				}
				
				/*console.log
				( 
					'next_max ' + nextLine.name + ' [' + nextLine.direction.x + ',' + nextLine.direction.y + '], ' + 
					'max:' + nextLine.maxLength + ', ' + 
					'before:' + nextLineLength + ', ' +					
					'diff:' + difference + ', ' + 
					'after:' + this._getLineLength( nextLine.name, lines2 ) 
				);*/
			}
			else if( nextLineLength < nextLine.minLength )
			{
				const difference = nextLine.minLength - nextLineLength;
				
				if( nextLineIsHorizontal )
				{
					start2.position.x += difference * -nextLine.direction.x;
					end2.position.x += difference * -nextLine.direction.x;
				}
				else 
				{
					start2.position.y += difference * -nextLine.direction.y;
					end2.position.y += difference * -nextLine.direction.y;
				}
				
				/*console.log
				( 
					'next_min ' + nextLine.name + ' [' + nextLine.direction.x + ',' + nextLine.direction.y + '], ' + 
					'min:' + nextLine.minLength + ', ' + 
					'before:' + nextLineLength + ', ' +					
					'diff:' + difference + ', ' + 
					'after:' + this._getLineLength( nextLine.name, lines2 ) 
				);*/
			}				
			
			error = this._getError( lines2 );
			hasError = error !== NO_ERROR;
			
			if( hasError )
			{
				start2.position.copy( newStartPosition );
				end2.position.copy( newEndPosition );
				
				const prevLine = this._getLineToPoint( start2, lines2 );
				const prevLineLength = this._getLineLength( prevLine.name, lines2 );
				const prevLineIsHorizontal = Math.abs( prevLine.direction.x ) > Math.abs( prevLine.direction.y );
				
				if( prevLineLength > prevLine.maxLength )
				{
					const difference = prevLineLength - prevLine.maxLength;
				
					if( prevLineIsHorizontal )
					{
						start2.position.x -= difference * prevLine.direction.x;
						end2.position.x -= difference * prevLine.direction.x;
					}
					else 
					{
						start2.position.y -= difference * prevLine.direction.y;
						end2.position.y -= difference * prevLine.direction.y;
					}
					
					/*console.log
					( 
						'prev_max ' + prevLine.name + ' [' + prevLine.direction.x + ',' + prevLine.direction.y + '], ' + 
						'max:' + prevLine.maxLength + ', ' + 
						'before:' + prevLineLength + ', ' +					
						'diff:' + difference + ', ' + 
						'after:' + this._getLineLength( prevLine.name, lines2 ) 
					);*/
				}
				else if( prevLineLength < prevLine.minLength )
				{
					const difference = prevLine.minLength - prevLineLength;
				
					if( prevLineIsHorizontal )
					{
						start2.position.x += difference * prevLine.direction.x;
						end2.position.x += difference * prevLine.direction.x;
					}
					else 
					{
						start2.position.y += difference * prevLine.direction.y;
						end2.position.y += difference * prevLine.direction.y;
					}
					
					/*console.log
					( 
						'prev_min ' + prevLine.name + ' [' + prevLine.direction.x + ',' + prevLine.direction.y + '], ' + 
						'min:' + prevLine.minLength + ', ' + 
						'before:' + prevLineLength + ', ' +					
						'diff:' + difference + ', ' + 
						'after:' + this._getLineLength( prevLine.name, lines2 ) 
					);*/
				}
				
				error = this._getError( lines2 );
				hasError = error !== NO_ERROR;
			}
			
			
			if( hasError && ( error === SPACER_MIN_LENGTH_ERROR || error === SPACER_MAX_LENGTH_ERROR ) )
			{	
				start2.position.copy( newStartPosition );
				end2.position.copy( newEndPosition );
				
				for( let i = 0; i < this._spacers.length; i++ )
				{
					const { a, b, minLength, maxLength } = this._spacers[ i ];
					
					if( a === name || b === name )
					{
						//console.error( 'LINE [' + name + '] > SPACER [' + a + '-' + b + ']' );

						const line1 = this._getLine( a, lines2 ); // line1
						const line2 = this._getLine( b, lines2 ); // line2	
						const { distance } = getProjectedPointOnLine
						( 
							line1.start.position.x, line1.start.position.y, 
							line2.start.position.x, line2.start.position.y, 
							line2.end.position.x, line2.end.position.y
						);

						const isHorizontal = Math.abs( line1.direction.x ) > Math.abs( line1.direction.y );

						if( distance > maxLength )
						{
							const difference = distance - maxLength;
							
							if( isHorizontal )
							{
								start2.position.y -= difference * translationDirection.y;
								end2.position.y -= difference * translationDirection.y;
							}
							else 
							{
								start2.position.x -= difference * translationDirection.x;
								end2.position.x -= difference * translationDirection.x;
							}
							
							/*const { distance:distance2 } = getProjectedPointOnLine
							( 
								line1.start.position.x, line1.start.position.y, 
								line2.start.position.x, line2.start.position.y, 
								line2.end.position.x, line2.end.position.y
							);
							
							console.log( 'spacer_max', difference, distance2 );*/
						}
						else if( distance < minLength )
						{
							const difference = minLength - distance;
							
							if( isHorizontal )
							{
								start2.position.y -= difference * translationDirection.y;
								end2.position.y -= difference * translationDirection.y;
							}
							else 
							{
								start2.position.x -= difference * translationDirection.x;
								end2.position.x -= difference * translationDirection.x;
							}
							
							/*const { distance:distance2 } = getProjectedPointOnLine
							( 
								line1.start.position.x, line1.start.position.y, 
								line2.start.position.x, line2.start.position.y, 
								line2.end.position.x, line2.end.position.y
							);
							
							console.log( 'spacer_min', difference, distance2 );*/
						}
						
						error = this._getError( lines2 );
						hasError = error !== NO_ERROR;
						break;
					}						
				}
			}
			
			if( !hasError )
			{		
				points2.forEach( point =>
				{
					const { position } = this._getPoint( point.name );
					
					position.copy( point.position );
				} );
				
				this._computeGeometry();
				this._computeSupports();
				this._computeDecking();
				

			}
		}
		else 
		{
			hasError = true;
		}
		
		this.dispatchEvent( { type:'change', hasError } );
	}
	
	
	getLineWalled( name )
	{
		return this._getLine( name ).hasWall;
	}
	
	setLineWalled( name, hasWall )
	{
		const line = this._getLine( name );
			
		line.hasWall = !!hasWall;
			
		this.dispatchEvent( { type:line.hasWall ? 'wallAdded' : 'wallRemoved', name:line.name } );
		
		this._updateSupports();
	}
	
	getSupportUUIDNearestToPoint( point )
	{
		const { x:px, y:py } =  point;

		for( let i = 0; i < this._supports.length; i++ )
		{
			const { x, y } = this._supports[ i ].position;
			
			if( px >= x - SUPPORT_RADIUS && px <= x + SUPPORT_RADIUS && py >= y - SUPPORT_RADIUS && py <= y + SUPPORT_RADIUS )
			{
				return this._supports[ i ].uuid;
			}
		}
		
		return null;
	}
	
	getLineNameNearestToPoint( point, _distance = 50 ) 
	{
		const { x, y } =  point;
		
		const lines = [];
		
		this._lines.forEach( line =>
		{
			const { name, start, end, normal } = line;

			let x1, y1, x2, y2;
			
			if( Math.abs( normal.x ) > Math.abs( normal.y ) )
			{
				if( start.position.y < end.position.y )
				{
					x1 = start.position.x;
					y1 = start.position.y;
					y2 = end.position.y;
				}
				else 
				{
					x1 = end.position.x;
					y1 = end.position.y;
					y2 = start.position.y;				
				}
				
				if( y >= y1 && y <= y2 )
				{
					const distance = Math.abs( x - x1 );
					
					if( distance < _distance )
					{
						lines.push( { name, distance } );
					}
				}
			}
			else 
			{
				if( start.position.x < end.position.x )
				{
					x1 = start.position.x;
					y1 = start.position.y;
					x2 = end.position.x;
				}
				else 
				{
					x1 = end.position.x;
					y1 = end.position.y;
					x2 = start.position.x;				
				}
				
				if( x >= x1 && x <= x2 )
				{
					const distance = Math.abs( y - y1 );
					
					if( distance < _distance )
					{
						lines.push( { name, distance } );
					}
				}
				
			}
		} );

		lines.sort( ( a, b ) => a.distance - b.distance );
		
		return lines[ 0 ] ? lines[ 0 ].name : null;
	}

	getInputableNames() 
	{
		return [ ... this._inputables ];
	}

	getOuterPoints()
	{
		const points = [];
		
		this._points.forEach( point =>
		{
			const lineTo = this._getLineToPoint( point );
			const lineFrom = this._getLineFromPoint( point );
			const { name, position } = point;
			
			points.push
			( {		 
				name, 
				position:position.clone(),
				normal:new Vector2().addVectors( lineTo.normal, lineFrom.normal ),
			} );
		} );
		
		return points;
	}

	getTopInnerPoints()
	{		
		return this._topInnerPoints.map( point =>
		{
			const { name, position } = point;			
			return { name, position:position.clone() };
		} );
	}
	
	getBottomInnerPoints()
	{		
		return this._bottomInnerPoints.map( point =>
		{
			const { name, position } = point;			
			return { name, position:position.clone() };
		} );
	}
	
	getBeams()
	{
		return this._beams.map( beam =>
		{
			const { uuid, points, points2 } = beam;			
			const _beam = 
			{ 
				uuid,
				points:points.map( point => point.clone() ),
				points2:points2 ?? [],
			};
			
			return _beam;
		} );
	}
	
	getSectors()
	{
		return this._sectors.map( sector => 
		{
			const { box, traverses, counterTraverses } = sector;

			const sectors = 
			{ 
				box:box.clone(), 
				traverses:
				{
					spacing:( Math.floor( traverses.spacing * 100 ) / 100 ), 
					lines:traverses.lines.map( travers => [ travers[ 0 ].clone(), travers[ 1 ].clone() ] ), 
				},
				counterTraverses:
				{
					spacing:( Math.floor( counterTraverses.spacing * 100 ) / 100 ), 
					lines:counterTraverses.lines.map( travers => [ travers[ 0 ].clone(), travers[ 1 ].clone() ] ),
				}
			};
			
			return sectors;
		} );
	}

	_supportToData( support )
	{
		const { name, displayName, nextName, prevName, uuid, type, height, position, normal, edgePosition, lineFrom, lineTo, isMovable, axis } = support;
		const hasWall = ( lineFrom?.hasWall || lineTo?.hasWall ) && this._wallMaterial !== WALL_MATERIAL_OTHER;

		const data =
		{ 
			displayName, 
			uuid, 
			type,
			height,
			position:position.clone(), 
			edgePosition:edgePosition.clone(), 
			normal:normal.clone(),
			hasWall,
			isMovable,
		};

		if( isMovable )
		{
			Object.assign( data, { axis } );
		}
		
		return data;
	}
	
	_getSupportByUUID( uuid )
	{
		return this._supports.find( support => support.uuid === uuid );
	}

	getSupportsVersion()
	{
		return this._supportsVersion;
	}
	
	getElevation()
	{
		return this._elevation;
	}

	getSupport( uuid )
	{
		return this._supportToData( this._getSupportByUUID( uuid ) );
	}
	
	getSupports()
	{
		return this._supports.map( support => this._supportToData( support ) );
	}
	
	getDistancesBetweenSupports()
	{
		const distances = [];
		
		this._distancesBetweenSupports.forEach( distance =>
		{
			const { uuid, name, support1, support2, axis, line, normal } = distance;
			
			const position1 = support1.isCorner ? line.start.position.clone().addScaledVector( normal, -SUPPORT_RADIUS ) : support1.position;
			const position2 = support2.isCorner ? line.end.position.clone().addScaledVector( normal, -SUPPORT_RADIUS ) : support2.position;
			const midEdgePosition = position1.clone().addScaledVector( new Vector2().subVectors( position2, position1 ), 0.5 ).addScaledVector( normal, SUPPORT_RADIUS );
			
			distances.push
			( {
				uuid,
				displayName:support1.displayName + '-' + support2.displayName,
				axis,
				normal:normal.clone(),
				value:position1.distanceTo( position2 ), 
				midEdgePosition, 
			} );
		} );
		
		return distances;
	}

	setSupportType( uuid, type )
	{
		const support = this._getSupportByUUID( uuid );
		
		if( support )
		{
			const data = this._supportToData( support );
			
			if( data.type !== type )
			{
				if( SUPPORT_TYPES.includes( type ) && ( type === SUPPORT_TYPE_POST || ( type == SUPPORT_TYPE_WALL_MOUNT && data.hasWall ) ) )
				{
					support.type = type;
				}

				this.dispatchEvent( { type:'supportTypeChanged', uuid } );
			}
		}
	}

	setSupportHeight( uuid, height )
	{
		const support = this._getSupportByUUID( uuid );
		
		if( support )
		{			
			if( Number.isInteger( height ) )
			{
				height = Math.min( MAX_SUPPORT_HEIGHT, Math.max( MIN_SUPPORT_HEIGHT, height ) );

				if( support.height !== height )
				{
					support.height = height;
					
					let maxHeight = 0;
			
					this._supports.forEach( support2 => 
					{
						if( support2.type == SUPPORT_TYPE_POST )
							maxHeight = Math.max( maxHeight, support2.height );
					} );
					
					if( height > this._elevation )
					{
						this._elevation = height;
						this.dispatchEvent( { type:'elevationChanged' } );
					}
					
					if( maxHeight >= MIN_SUPPORT_HEIGHT && maxHeight < this._elevation )
					{
						this._elevation = maxHeight;
						this.dispatchEvent( { type:'elevationChanged' } );
					}
				}
			}
			
			this.dispatchEvent( { type:'supportHeightChanged', uuid } );
		}
	}
	
	setDistanceBetweenSupports( uuid, value )
	{
		const { axis, line, normal, support1, support2 } = this._distancesBetweenSupports.find( distance => distance.uuid === uuid );
		const position1 = support1.isCorner ? line.start.position.clone().addScaledVector( normal, -SUPPORT_RADIUS ) : support1.position;
		const position2 = support2.isCorner ? line.end.position.clone().addScaledVector( normal, -SUPPORT_RADIUS ) : support2.position;
		const support = !support2.isCorner ? support2 : support1;
		const position = support.position.clone();
		
		position[ axis ] += ( value - position1.distanceTo( position2 ) ) * ( support === support2 ? 1 : -1 );
		
		this.setSupportPosition( support.uuid, position );	
	}
	
	setSupportPosition( uuid, newPosition )
	{
		const { lineFrom, position, edgePosition, nextName, prevName, children } = this._getSupportByUUID( uuid );
		const { direction } = lineFrom;
		const prevSupport = this._supports.find( support => support.name === prevName );
		const nextSupport = this._supports.find( support => support.name === nextName );	
		const axis = Math.abs( direction.x ) > Math.abs( direction.y ) ? 'x' : 'y';
		
		newPosition.round();

		const prevPosition = prevSupport.isCorner ? prevSupport.lineFrom.start.position : prevSupport.position;
		const nextPosition = nextSupport.isCorner ? nextSupport.lineFrom.start.position : nextSupport.position;

		position[ axis ] = newPosition[ axis ];

		if( ( prevPosition[ axis ] - position[ axis ] ) * -direction[ axis ] < MIN_DISTANCE_BETWEEN_SUPPORTS )
		{
			position[ axis ] = prevPosition[ axis ] + MIN_DISTANCE_BETWEEN_SUPPORTS * direction[ axis ];
		}
		else if( ( nextPosition[ axis ] - position[ axis ] ) * direction[ axis ] < MIN_DISTANCE_BETWEEN_SUPPORTS )
		{
			position[ axis ] = nextPosition[ axis ] - MIN_DISTANCE_BETWEEN_SUPPORTS * direction[ axis ];
		}
		
		if( ( prevPosition[ axis ] - position[ axis ] ) * -direction[ axis ] > MAX_DISTANCE_BETWEEN_SUPPORTS )
		{
			position[ axis ] = prevPosition[ axis ] + MAX_DISTANCE_BETWEEN_SUPPORTS * direction[ axis ];
		}
		else if( ( nextPosition[ axis ] - position[ axis ] ) * direction[ axis ] > MAX_DISTANCE_BETWEEN_SUPPORTS )
		{
			position[ axis ] = nextPosition[ axis ] - MAX_DISTANCE_BETWEEN_SUPPORTS * direction[ axis ];
		}

		//
		
		edgePosition.copy( position.clone().addScaledVector( lineFrom.normal, SUPPORT_RADIUS ) );
		
		// console.log( edgePosition.x, edgePosition.y );
		// console.log( edgePosition.distanceTo( nextPosition ), edgePosition.distanceTo( prevPosition ) );
		
		this.dispatchEvent( { type:'supportPositionChanged', uuid } );	

		children.forEach( support => 
		{
			support.position[ axis ] = position[ axis ]; 
			support.edgePosition.copy( support.position.clone().addScaledVector( support.normal, SUPPORT_RADIUS ) );
			
			this.dispatchEvent( { type:'supportPositionChanged', uuid:support.uuid } );
		} );
		
		this._beams.forEach( beam =>
		{
			if( beam.A?.uuid === uuid )
			{
				this._updateBeam( beam );
				this.dispatchEvent( { type:'beamRecomputed', uuid:beam.uuid } );
				console.log( 'after beamRecomputed' );
			}
		} );
		
		//

		this._computeTravers2( true );
	}
	
	setElevation( height )
	{
		if( Number.isInteger( height ) )
		{
			height = Math.min( MAX_SUPPORT_HEIGHT, Math.max( MIN_SUPPORT_HEIGHT, height ) );
			
			this._elevation = height;
			this.dispatchEvent( { type:'elevationChanged' } );

			this._supports.forEach( support =>
			{
				if( support.height !== height )
				{
					support.height = height;
					
					this.dispatchEvent( { type:'supportHeightChanged', uuid:support.uuid } );
				}
			} );
		}
	}
	
	getWalls()
	{
		const walls = [];
		
		this._lines.forEach( ( line, index, array ) =>
		{
			const { name, start, end, normal, hasWall } = line;
			const prev = array[ index - 1 >= 0 ? index - 1 : array.length - 1 ];
			const next = array[ ( index + 1 ) % array.length ];

			if( hasWall )
			{
				const edgeStart = new Vector2().copy( start.position );
				const edgeEnd = new Vector2().copy( end.position );
				const oppositeEdgeStart = edgeStart.clone().addScaledVector( normal, WALL_WIDTH );
				const oppositeEdgeEnd = edgeEnd.clone().addScaledVector( normal, WALL_WIDTH );
				
				if( prev.hasWall )
				{
					const prevEdgeStart = new Vector2().copy( prev.start.position );
					const prevEdgeEnd = new Vector2().copy( prev.end.position );
					const prevOppositeEdgeStart = prevEdgeStart.clone().addScaledVector( prev.normal, WALL_WIDTH );
					const prevOppositeEdgeEnd = prevEdgeEnd.clone().addScaledVector( prev.normal, WALL_WIDTH );
					
					const intersection = getLinesIntersection
					( 
						oppositeEdgeStart.x, oppositeEdgeStart.y,
						oppositeEdgeEnd.x, oppositeEdgeEnd.y,
						prevOppositeEdgeStart.x, prevOppositeEdgeStart.y,
						prevOppositeEdgeEnd.x, prevOppositeEdgeEnd.y 
					);
					
					oppositeEdgeStart.copy( intersection.point );							
				}
				
				if( next.hasWall )
				{
					const nextEdgeStart = new Vector2().copy( next.start.position );
					const nextEdgeEnd = new Vector2().copy( next.end.position );
					const nextOppositeEdgeStart = nextEdgeStart.clone().addScaledVector( next.normal, WALL_WIDTH );
					const nextOppositeEdgeEnd = nextEdgeEnd.clone().addScaledVector( next.normal, WALL_WIDTH );
					
					const intersection = getLinesIntersection
					( 
						oppositeEdgeStart.x, oppositeEdgeStart.y,
						oppositeEdgeEnd.x, oppositeEdgeEnd.y,
						nextOppositeEdgeStart.x, nextOppositeEdgeStart.y,
						nextOppositeEdgeEnd.x, nextOppositeEdgeEnd.y 
					);
					
					oppositeEdgeEnd.copy( intersection.point );
				}
				
				const wall = 
				{ 
					name,
					normal:line.normal.clone(),
					center:edgeStart.clone().add( edgeEnd ).multiplyScalar( 0.5 ),
					front:{ start:edgeStart, end:edgeEnd },
					back:{ start:oppositeEdgeStart, end:oppositeEdgeEnd },
				};
				
				walls.push( wall );
			}
		} );
		
		return walls;
	}
	
	_lineToData( line )
	{
		const { name, start, end, direction, normal, hasWall } = line;
		const data =
		{ 
			name,
			hasWall,
			start:
			{
				name:start.name,
				position:start.position.clone(),
			}, 
			end:
			{
				name:end.name,
				position:end.position.clone(),
			},
			direction:direction.clone(),
			normal:normal.clone(),
		};
		
		return data;
	}
	
	getLine( name )
	{
		return this._lineToData( this._lines.find( line => line.name === name ) )
	}

	getLines()
	{
		const lines = [];
		
		this._lines.forEach( line => lines.push( this._lineToData( line ) ) );
		
		return lines;
	}
	
}
 