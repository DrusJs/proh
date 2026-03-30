import { Vector2 } from 'three';
import { Clipper, FillRule, Path64, Paths64, Point64 } from '../libs/clipper2.js';

export const сlipperIntersect = ( subjectPolygon, clipPolygon ) =>
{
	const polygonToPath64 = ( polygon ) =>
	{
		const clipperPath = new Path64();
		
		polygon.forEach( point => clipperPath.push( new Point64( point[ 0 ], point[ 1 ] ) ) );
		
		return clipperPath;
	};
	
	const subj = new Paths64();
    const clip = new Paths64();
	
	subj.push( polygonToPath64( subjectPolygon ) );
    clip.push( polygonToPath64( clipPolygon ) );
	
	const shapes = [];

	Clipper.Intersect( subj, clip, FillRule.NonZero ).forEach( path =>
	{
		const shape = [];
		
		path.forEach( point =>
		{
			const { x, y } = point;
			
			if( shape.length > 0 && shape[ shape.length - 1 ].x === x && shape[ shape.length - 1 ].y === y ) 
			{
			}
			else 
			{
				shape.push( new Vector2( x, y ) );
			}
		} );
		
		if( shape.length > 0 )
		{
			shapes.push( shape );
		}
	} );
	
	return shapes;
};

export const isIntersect = ( x1, y1, x2, y2, x3, y3, x4, y4 ) => 
{
	const d = ( x2 - x1 ) * ( y4 - y3 ) - ( x4 - x3 ) * ( y2 - y1 );
	
	if( d === 0 ) 
	{
		return false;
	}
	
	const s = ( ( y4 - y3 ) * ( x4 - x1 ) + ( x3 - x4 ) * ( y4 - y1 ) ) / d;
	const t = ( ( y1 - y2 ) * ( x4 - x1 ) + ( x2 - x1 ) * ( y4 - y1 ) ) / d; 

	return ( s > 0 && s < 1 ) && ( t > 0 && t < 1 );
};

export const getLinesIntersection = ( x1, y1, x2, y2, x3, y3, x4, y4 ) =>
{
	const d = ( y4 - y3 ) * ( x2 - x1 ) - ( x4 - x3 ) * ( y2 - y1 );

	if( d == 0 )
	{		
		return null;
	}

	const na = ( x4 - x3 ) * ( y1 - y3 ) - ( y4 - y3 ) * ( x1 - x3 );
	const nb = ( x2 - x1 ) * ( y1 - y3 ) - ( y2 - y1 ) * ( x1 - x3 );
	const a = na / d;
	const b = nb / d;

	return { point:new Vector2( x1 + a * ( x2 - x1 ), y1 + a * ( y2 - y1 ) ), isOnLine:a >= 0 && a <= 1 && b >= 0 && b <= 1 };
};

export const getProjectedPointOnLine = ( x, y, x1, y1, x2, y2 ) =>
{
	const a = x - x1;
	const b = y - y1;
	const c = x2 - x1;
	const d = y2 - y1;

	const len = c * c + d * d;

	if( len > 0 )
	{
		const dot = a * c + b * d;
		const v = dot / len;
		const xx = x1 + v * c;
		const yy = y1 + v * d;
		const dx = x - xx;
		const dy = y - yy;
			
		return { point:new Vector2( xx, yy ), isOnLine:v >= 0 && v <= 1, distance:Math.sqrt( dx * dx + dy * dy ) };
	}
	
	return null;
};