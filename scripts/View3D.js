import 
{ 
	EventDispatcher, WebGLRenderer, PerspectiveCamera, 
	Vector3, Box3, Path, Shape, ShapeGeometry, ExtrudeGeometry, BoxGeometry, SphereGeometry, PlaneGeometry,
	Scene, Group, GridHelper, Mesh,
	DoubleSide, MeshBasicMaterial, MeshPhongMaterial, MeshStandardMaterial,
	AmbientLight, DirectionalLight,
	BufferGeometry, Float32BufferAttribute, SRGBColorSpace, LinearSRGBColorSpace,
	PMREMGenerator, PCFSoftShadowMap, CameraHelper, Spherical,
	
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
			
import 
{ 
	TRAVERSE_HEIGHT, COUNTER_TRAVERS_HEIGHT,
	SUPPORT_TYPE_POST, SUPPORT_TYPE_WALL_MOUNT,
	MIN_SUPPORT_HEIGHT, 
	BORDER_HEIGHT,
	BOTTOM_BORDER_HEIGHT,
	DECKING_HEIGHT,
	BOTTOM_DECKING_ELEVATION,
	BEAM_HEIGHT, BEAM_TOP_HEIGHT,
	WALL_MATERIAL_BRICK, WALL_MATERIAL_RUBBLE, WALL_MATERIAL_CONCRETE, WALL_MATERIAL_OTHER,
} from './Shape.js';
import { EDIT_MODE_SHAPE, EDIT_MODE_WALLS, EDIT_MODE_DECKING, EDIT_MODE_SUPPORTS } from './Constants.js';

const WALL_MOUNT_HEIGHT = 0;
const fontLoader = new FontLoader();

const _createGeometry = ( a, b, c, d, indices, uvs ) => 
{			
	const geometry = new BufferGeometry();
	
	geometry.setIndex( indices );
	geometry.setAttribute( 'position', new Float32BufferAttribute
	( [ 
		a.x, a.y, a.z,
		b.x, b.y, b.z, 
		c.x, c.y, c.z, 
		d.x, d.y, d.z, 
	], 3 ) );
	geometry.setAttribute( 'uv', new Float32BufferAttribute( uvs, 2 ) );
	geometry.computeVertexNormals();
	
	return geometry;
};

let font = null;

fontLoader.load( 'fonts/Arial_Cyrillic_Regular.json', _font => font = _font );

class View3D extends EventDispatcher
{
	constructor() 
	{
		super();
		
		this._onDeckingColorChanged = ( event ) => this.onDeckingColorChanged( event );
		this._onDeckingRecomputed = ( event ) => this.onDeckingRecomputed( event );
		this._onTraversesRecomputed = ( event ) => this.onTraversesRecomputed( event );
		this._onSupportPositionChanged = ( event ) => this.onSupportPositionChanged( event );
		this._onSupportHeightChanged = ( event ) => this.onSupportHeightChanged( event );
		this._onSupportTypeChanged = ( event ) => this.onSupportTypeChanged( event );
		this._onBeamRecomputed = ( event ) => this.onBeamRecomputed( event );
		this._onWallAdded = ( event ) => this.onWallAdded( event );
		this._onWallRemoved = ( event ) => this.onWallRemoved( event );
		this._onWallMaterialChanged = ( event ) => this.onWallMaterialChanged( event );

		this.editMode = null;
		this.active = false;
		this.requestId = null;
		this.needsRender = true;
		this.needsShadowUpdate = true;
		this.needsVersionUpgrade = true;
		this.needsSupportsUpdate = false;
		this.needsBeamsUpdate = false;
		this.width = 1;
		this.height = 1;
		this.elevation = 0;
		this.version = 0;
		
		this.bottomDeckingMaterial = new MeshStandardMaterial( { color:0xEFEFEF, side:DoubleSide } );
		this.deckingMaterial = new MeshStandardMaterial( { /*visible:false,*/ side:DoubleSide } );
		this.wallMaterial = new MeshStandardMaterial( { color:0xEFEFEF, side:DoubleSide } );
		this.wallBaseMaterial = new MeshBasicMaterial( { color:0xEFEFEF, side:DoubleSide } );
		this.supportMaterial = new MeshStandardMaterial( { color:0x777777, roughness:0.2, side:DoubleSide } );
		this.supportsTextMaterial = new MeshBasicMaterial( { color:0x000000, depthTest:false, transparent:true } );
		this.errorDeckingMaterial = new MeshBasicMaterial( { color:0xFF3DB5 } );
		this.groundMaterial = new MeshStandardMaterial( { color:0xFFFFFF/*, side:DoubleSide*/ } );

		
		this.renderer = new WebGLRenderer( { antialias:true } );
		this.renderer.outputColorSpace = SRGBColorSpace; //LinearSRGBColorSpace;//SRGBColorSpace; 
		this.renderer.autoClear = false;
		this.renderer.setClearColor( 0xFFFFFF );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = PCFSoftShadowMap;
	
		this.camera = new PerspectiveCamera( 45, 1.0, 10, 100000 );
		
		this.container = new Group();			
		this.counterTraversesGroup = new Group();
		this.traversesGroup = new Group();
		this.supportsGroup = new Group();
		this.supportsTextGroup = new Group();
		this.deckingGroup = new Group();
		this.bottomDeckingGroup = new Group();
		this.borderGroup = new Group();
		this.beamsGroup = new Group();
		this.wallsGroup = new Group();
		this.wallBasesGroup = new Group();
		

		this.supportsTextGroup.visible = this.editMode === EDIT_MODE_SUPPORTS;
		

		this.container.add( this.counterTraversesGroup, this.traversesGroup, this.supportsGroup, this.supportsTextGroup, 
							this.deckingGroup, this.bottomDeckingGroup, 
							this.borderGroup, this.beamsGroup, this.wallsGroup, this.wallBasesGroup );
		
		
		//
		
		this.groundMesh = new Mesh( new PlaneGeometry( 30000, 30000 ), this.groundMaterial );
		this.groundMesh.receiveShadow = true;
		this.groundMesh.rotateX( Math.PI / -2 );

		const polarAngle = Math.PI / 8;
		const azimuthAngle = Math.PI / 4;
		const spherical = new Spherical( 15000, polarAngle, azimuthAngle );
		
		spherical.makeSafe();
		
		this.light = new DirectionalLight( 0xFFFFFF, 1.8 );
		
		this.light.target.position.set( 0, 0, 0 );
		this.light.position.copy( new Vector3().setFromSpherical( spherical ) );
		this.light.castShadow = true;
		this.light.shadow.autoUpdate = false;
		this.light.shadow.bias = -0.0005;
		this.light.shadow.mapSize.width = 
		this.light.shadow.mapSize.height = 4096 * 2;
		this.light.shadow.camera.near = 1;
		this.light.shadow.camera.far = 30000;
		this.light.shadow.camera.bottom = 
		this.light.shadow.camera.left = -15000;
		this.light.shadow.camera.top = 
		this.light.shadow.camera.right = 15000;
		
		const environment = new RoomEnvironment( this.renderer );
		const pmremGenerator = new PMREMGenerator( this.renderer );
		
		this.scene = new Scene();
		this.scene.environment = pmremGenerator.fromScene( environment ).texture;
		this.scene.environmentIntensity = 0.5;
		this.scene.add( this.container, this.camera, this.groundMesh, this.light, this.light.target ); // new CameraHelper( this.light.shadow.camera )
		//this.scene.add( new GridHelper( 10000, 10, 0xEFEFEF, 0xEFEFEF ) );
		//this.scene.add( new AmbientLight( 0xFFFFFF, 0.5 ) );
		
		this.controls = new OrbitControls( this.camera, this.renderer.domElement );
		this.controls.addEventListener( 'change', () => this.needsRender = true );				
		this.controls.screenSpacePanning = false;
		this.controls.enablePan = true;
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.1;
		this.controls.minDistance = this.controls.maxDistance = 1000;
		this.controls.maxPolarAngle = this.controls.minPolarAngle = Math.PI / 180 * 30;
		this.controls.update();

		this.controls.minPolarAngle = Math.PI / 180 * 0;
		this.controls.maxPolarAngle = Math.PI / 180 * 100;//87;
		this.controls.minAzimuthAngle = -Infinity;
		this.controls.maxAzimuthAngle = Infinity;

		//this.fitToScreen();		
	}
	
	getElement = () => this.renderer.domElement;
	
	setShape( shape )
	{
		if( this.shape != shape )
		{
			this.shape?.removeEventListener( 'deckingColorChanged', this._onDeckingColorChanged );
			this.shape?.removeEventListener( 'deckingRecomputed', this._onDeckingRecomputed );
			this.shape?.removeEventListener( 'traversesRecomputed', this._onTraversesRecomputed );
			this.shape?.removeEventListener( 'supportPositionChanged', this._onSupportPositionChanged );
			this.shape?.removeEventListener( 'supportHeightChanged', this._onSupportHeightChanged );
			this.shape?.removeEventListener( 'supportTypeChanged', this._onSupportTypeChanged );
			this.shape?.removeEventListener( 'beamRecomputed', this._onBeamRecomputed );
			this.shape?.removeEventListener( 'wallAdded', this._onWallAdded );
			this.shape?.removeEventListener( 'wallRemoved', this._onWallRemoved );
			this.shape?.removeEventListener( 'wallMaterialChanged', this._onWallMaterialChanged );
			
			this._clear();
			
			this.shape = shape;
			
			if( this.shape )
			{
				this.shape.addEventListener( 'deckingColorChanged', this._onDeckingColorChanged );
				this.shape.addEventListener( 'deckingRecomputed', this._onDeckingRecomputed );
				this.shape.addEventListener( 'traversesRecomputed', this._onTraversesRecomputed );
				this.shape.addEventListener( 'supportPositionChanged', this._onSupportPositionChanged );
				this.shape.addEventListener( 'supportHeightChanged', this._onSupportHeightChanged );
				this.shape.addEventListener( 'supportTypeChanged', this._onSupportTypeChanged );
				this.shape.addEventListener( 'beamRecomputed', this._onBeamRecomputed );
				this.shape.addEventListener( 'wallAdded', this._onWallAdded );
				this.shape.addEventListener( 'wallRemoved', this._onWallRemoved );
				this.shape.addEventListener( 'wallMaterialChanged', this._onWallMaterialChanged );

				this._create();
			}
		}
	}
	
	onDeckingColorChanged( event )
	{
		this.deckingMaterial.color.set( this.shape.getDeckingColor() );
		this.needsRender = true;
	}
	
	onDeckingRecomputed( event )
	{
		this._createDecking();
		this.needsRender = true;
	}
	
	onDeckingBoardWidthChanged( event )
	{
		this._createDecking();
		this.needsRender = true;
	}
	
	_updateSupports()
	{
		console.log( '_updateSupports' );
		
		const shape = this.shape;		
		const oldElevation = this.elevation;
		
		this.elevation = shape.getElevation();

		shape.getSupports().forEach( support =>
		{
			const { uuid, type, height:supportHeight, edgePosition, normal } = support;
			const isWallMount = ( type === SUPPORT_TYPE_WALL_MOUNT );
			const { x, y } = support.position;
			const height = isWallMount ? WALL_MOUNT_HEIGHT : supportHeight;
			const supportMesh = this.supportsGroup.getObjectByName( uuid );
			
			supportMesh.visible = !isWallMount;
			supportMesh.scale.set( 1, height, 1 );
			supportMesh.position.set( x, this.elevation - height / 2, y );
			
			const supportDisplayNameMesh = this.supportsTextGroup.getObjectByName( uuid );
			
			supportDisplayNameMesh.position.set( edgePosition.x + normal.x * 100, 1, edgePosition.y + normal.y * 100 );
		} );
		
		this.counterTraversesGroup.position.y = this.elevation + BORDER_HEIGHT - DECKING_HEIGHT - COUNTER_TRAVERS_HEIGHT;
		this.traversesGroup.position.y = this.elevation + BORDER_HEIGHT - DECKING_HEIGHT - COUNTER_TRAVERS_HEIGHT - TRAVERSE_HEIGHT;
		this.bottomDeckingGroup.position.y = this.elevation + BOTTOM_DECKING_ELEVATION;//BEAM_HEIGHT;
		this.deckingGroup.position.y = this.elevation + BORDER_HEIGHT - DECKING_HEIGHT;
		this.borderGroup.position.y = this.elevation;
		this.beamsGroup.position.y = this.elevation;

		if( oldElevation !== this.elevation )
		{
			this._createWalls();
		}
		
		this.needsRender = true;
		this.needsShadowUpdate = true;
		this.needsVersionUpgrade = true;
	}
	
	onTraversesRecomputed( event )
	{
		this._createTraverses();
		//console.warn( 'traverses' );
	}
	
	onSupportPositionChanged( event )
	{
		this.needsSupportsUpdate = true;
		//this._updateSupports();
	}
	
	onSupportHeightChanged( event )
	{
		//this._updateSupports();	
		this.needsSupportsUpdate = true;
	}
	
	onSupportTypeChanged( event )
	{
		//this._updateSupports();
		this.needsSupportsUpdate = true;
	}
	
	onBeamRecomputed( event )
	{
		this.needsBeamsUpdate = true;
	}
	
	onWallAdded( event )
	{
		// TODO: удалять и добавлять отдельные стены
		this._createWalls();
	}
	
	onWallRemoved( event )
	{
		this._createWalls();
	}
	
	_wallMaterialToColor( material )
	{
		if( material === WALL_MATERIAL_BRICK ) return 0xe06e30;
		if( material === WALL_MATERIAL_CONCRETE ) return 0x969696;
		if( material === WALL_MATERIAL_RUBBLE ) return 0xe2ceb3;
		if( material === WALL_MATERIAL_OTHER ) return 0xFFFFFF;

		return 0xFFFFFF;	
	}
	
	onWallMaterialChanged( event ) 
	{
		const material = this.shape.getWallMaterial();
		const color = this._wallMaterialToColor( material );
		
		//console.log( material, color.toString( 16 ) );
		
		this.wallMaterial.color.set( color );
		
		this.needsRender = true;
	}
	
	_clearGroup( group )
	{
		for( let i = group.children.length - 1; i >= 0; i-- )
		{
			group.children[ i ].geometry.dispose();
			group.children[ i ].removeFromParent();
		}
		
		this.needsShadowUpdate = true;
		this.needsRender = true;
	}
	
	_clear()
	{
		this._clearGroup( this.counterTraversesGroup );
		this._clearGroup( this.traversesGroup );
		this._clearGroup( this.supportsGroup );
		this._clearGroup( this.supportsTextGroup );
		this._clearGroup( this.deckingGroup );
		this._clearGroup( this.bottomDeckingGroup );
		this._clearGroup( this.borderGroup );
		this._clearGroup( this.beamsGroup );
		this._clearGroup( this.wallsGroup );
		this._clearGroup( this.wallBasesGroup );
		
		this.needsRender = true;
	}
	
	_createTraverses()
	{
		this._clearGroup( this.counterTraversesGroup );
		this._clearGroup( this.traversesGroup );
		
		this.shape.getTraverses().forEach( shape =>
		{
			const traverseShape = new Shape();
				
			shape.forEach( ( point, index ) =>
			{
				const { x, y } = point;
				
				if( index === 0 ) traverseShape.moveTo( x, -y );		
				else traverseShape.lineTo( x, -y );
			} );
			
			const traverseGeometry = new ExtrudeGeometry( [ traverseShape ], { bevelEnabled:false, depth:TRAVERSE_HEIGHT } );
			const traverseMesh = new Mesh( traverseGeometry, this.supportMaterial );
			
			traverseMesh.castShadow = true;
			traverseMesh.receiveShadow = true;
			traverseMesh.rotateX( Math.PI / -2 );
			
			this.traversesGroup.add( traverseMesh );
		} );
		
		this.shape.getCounterTraverses().forEach( shape =>
		{
			const traverseShape = new Shape();
				
			shape.forEach( ( point, index ) =>
			{
				const { x, y } = point;
				
				if( index === 0 ) traverseShape.moveTo( x, -y );		
				else traverseShape.lineTo( x, -y );
			} );
			
			const traverseGeometry = new ExtrudeGeometry( [ traverseShape ], { bevelEnabled:false, depth:COUNTER_TRAVERS_HEIGHT } );
			const traverseMesh = new Mesh( traverseGeometry, this.supportMaterial );
			
			traverseMesh.castShadow = true;
			traverseMesh.receiveShadow = true;
			traverseMesh.rotateX( Math.PI / -2 );
			
			this.counterTraversesGroup.add( traverseMesh );
		} );
		
		this.counterTraversesGroup.position.y = this.elevation + BORDER_HEIGHT - DECKING_HEIGHT - COUNTER_TRAVERS_HEIGHT;
		this.traversesGroup.position.y = this.elevation + BORDER_HEIGHT - DECKING_HEIGHT - COUNTER_TRAVERS_HEIGHT - TRAVERSE_HEIGHT;
		
		this.needsShadowUpdate = true;
		this.needsRender = true;
	}
	
	_createDecking()
	{
		this._clearGroup( this.deckingGroup );
		this._clearGroup( this.bottomDeckingGroup );

		this.shape.getDeckingBoards().forEach( board => 
		{
			board.shapes.forEach( shape =>
			{
				const deckingShape = new Shape();
				
				shape.forEach( ( point, index ) =>
				{
					const { x, y } = point;
					
					if( index === 0 ) deckingShape.moveTo( x, -y );		
					else deckingShape.lineTo( x, -y );
				} );
				
				const deckingGeometry = new ExtrudeGeometry( [ deckingShape ], { bevelEnabled:false, depth:DECKING_HEIGHT } );
				const deckingMesh = new Mesh( deckingGeometry, this.deckingMaterial );
				
				deckingMesh.castShadow = true;
				deckingMesh.receiveShadow = true;
				deckingMesh.rotateX( Math.PI / -2 );
				
				this.deckingGroup.add( deckingMesh );

			} );
	
		} );
		
		this.shape.getBottomDeckingBoards().forEach( board => 
		{

			board.shapes.forEach( shape =>
			{
				const deckingShape = new Shape();
				
				shape.forEach( ( point, index ) =>
				{
					const { x, y } = point;
					
					if( index === 0 ) deckingShape.moveTo( x, -y );		
					else deckingShape.lineTo( x, -y );
				} );
				
				const deckingGeometry = new ExtrudeGeometry( [ deckingShape ], { bevelEnabled:false, depth:DECKING_HEIGHT } );
				const deckingMesh = new Mesh( deckingGeometry, this.bottomDeckingMaterial );
				
				deckingMesh.castShadow = true;
				deckingMesh.receiveShadow = true;
				deckingMesh.rotateX( Math.PI / -2 );
				
				this.bottomDeckingGroup.add( deckingMesh );

			} );
	
		} );


		this.deckingGroup.position.y = this.elevation + BORDER_HEIGHT - DECKING_HEIGHT;
		this.bottomDeckingGroup.position.y = this.elevation + BOTTOM_DECKING_ELEVATION;//BEAM_HEIGHT;
		
		
		this.needsShadowUpdate = true;
		this.needsVersionUpgrade = true;
	}
	
	_createWalls() // Версию не обновляем, так как стены не нужны в AR
	{
		this._clearGroup( this.wallsGroup );
		this._clearGroup( this.wallBasesGroup );

		this.shape.getWalls().forEach( wall =>
		{
			const { normal, center, front, back } = wall;
			const shape = new Shape();
			
			shape.moveTo( front.start.x, -front.start.y );
			shape.lineTo( back.start.x, -back.start.y );
			shape.lineTo( back.end.x, -back.end.y );
			shape.lineTo( front.end.x, -front.end.y );
			shape.lineTo( front.start.x, -front.start.y );
			
			const height = this.elevation + BORDER_HEIGHT + 2500;
			const geometry = new ExtrudeGeometry( [ shape ], { bevelEnabled:false, depth:height } );
			const mesh = new Mesh( geometry, this.wallMaterial );
			
			Object.assign( mesh.userData, 
			{
				center:new Vector3( center.x, 0, center.y ),
				normal:new Vector3( normal.x, 0, normal.y ),
			} );
			
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			mesh.rotateX( Math.PI / -2 );
			
			this.wallsGroup.add( mesh );
			
			const geometry2 = new ExtrudeGeometry( [ shape ], { bevelEnabled:false, depth:1 } );
			const mesh2 = new Mesh( geometry2, this.wallBaseMaterial );
			
			mesh2.castShadow = true;
			mesh2.receiveShadow = true;
			mesh2.rotateX( Math.PI / -2 );
			
			this.wallBasesGroup.add( mesh2 );

		} );
		
		this.needsShadowUpdate = true;
		this.needsRender = true;
	}
	
	_createBeams()
	{
		this._clearGroup( this.beamsGroup );
		
		this.shape.getBeams().forEach( beam =>
		{
			const { points, points2 } = beam;
			
			{
				const [ p1, p2, p3, p4 ] = points; 
			
				let a, b, c, d;
				
				a = new Vector3( p1.x, BEAM_HEIGHT, p1.y );
				b = new Vector3( p2.x, BEAM_HEIGHT, p2.y );
				c = new Vector3( p3.x, BEAM_HEIGHT, p3.y );
				d = new Vector3( p4.x, BEAM_HEIGHT, p4.y );
				
				const top = _createGeometry( a, b, c, d, [ 0, 2, 1, 0, 3, 2 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
					
				a = new Vector3( p1.x, 0, p1.y );
				b = new Vector3( p2.x, 0, p2.y );
				c = new Vector3( p3.x, 0, p3.y );
				d = new Vector3( p4.x, 0, p4.y );
				
				const bottom = _createGeometry( a, b, c, d, [ 0, 1, 2, 0, 2, 3 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
				
				a = new Vector3( p1.x, 0, p1.y );
				b = new Vector3( p2.x, 0, p2.y );
				c = new Vector3( p2.x, BEAM_HEIGHT, p2.y );
				d = new Vector3( p1.x, BEAM_HEIGHT, p1.y );
				
				const side1 = _createGeometry( a, b, c, d, [ 0, 2, 1, 0, 3, 2 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
				
				a = new Vector3( p2.x, 0, p2.y );
				b = new Vector3( p3.x, 0, p3.y );
				c = new Vector3( p3.x, BEAM_HEIGHT, p3.y );
				d = new Vector3( p2.x, BEAM_HEIGHT, p2.y );
				
				const side2 = _createGeometry( a, b, c, d, [ 0, 2, 1, 0, 3, 2 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
				
				a = new Vector3( p3.x, 0, p3.y );
				b = new Vector3( p4.x, 0, p4.y );
				c = new Vector3( p4.x, BEAM_HEIGHT, p4.y );
				d = new Vector3( p3.x, BEAM_HEIGHT, p3.y );
				
				const side3 = _createGeometry( a, b, c, d, [ 0, 2, 1, 0, 3, 2 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
				
				a = new Vector3( p4.x, 0, p4.y );
				b = new Vector3( p1.x, 0, p1.y );
				c = new Vector3( p1.x, BEAM_HEIGHT, p1.y );
				d = new Vector3( p4.x, BEAM_HEIGHT, p4.y );
				
				const side4 = _createGeometry( a, b, c, d, [ 0, 2, 1, 0, 3, 2 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
				
				const beamGeometry = BufferGeometryUtils.mergeGeometries( [ top, bottom, side1, side2, side3, side4 ], false );
				const beamMesh = new Mesh( beamGeometry, this.supportMaterial );
					
				beamMesh.castShadow = true;
				beamMesh.receiveShadow = true;
				
				this.beamsGroup.add( beamMesh );
			}
			
			{
				const [ p1, p2, p3, p4 ] = points2; 
			
				let a, b, c, d;
				
				a = new Vector3( p1.x, BEAM_TOP_HEIGHT, p1.y );
				b = new Vector3( p2.x, BEAM_TOP_HEIGHT, p2.y );
				c = new Vector3( p3.x, BEAM_TOP_HEIGHT, p3.y );
				d = new Vector3( p4.x, BEAM_TOP_HEIGHT, p4.y );
				
				const top = _createGeometry( a, b, c, d, [ 0, 2, 1, 0, 3, 2 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
					
				a = new Vector3( p1.x, 0, p1.y );
				b = new Vector3( p2.x, 0, p2.y );
				c = new Vector3( p3.x, 0, p3.y );
				d = new Vector3( p4.x, 0, p4.y );
				
				const bottom = _createGeometry( a, b, c, d, [ 0, 1, 2, 0, 2, 3 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
				
				a = new Vector3( p1.x, 0, p1.y );
				b = new Vector3( p2.x, 0, p2.y );
				c = new Vector3( p2.x, BEAM_TOP_HEIGHT, p2.y );
				d = new Vector3( p1.x, BEAM_TOP_HEIGHT, p1.y );
				
				const side1 = _createGeometry( a, b, c, d, [ 0, 2, 1, 0, 3, 2 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
				
				a = new Vector3( p2.x, 0, p2.y );
				b = new Vector3( p3.x, 0, p3.y );
				c = new Vector3( p3.x, BEAM_TOP_HEIGHT, p3.y );
				d = new Vector3( p2.x, BEAM_TOP_HEIGHT, p2.y );
				
				const side2 = _createGeometry( a, b, c, d, [ 0, 2, 1, 0, 3, 2 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
				
				a = new Vector3( p3.x, 0, p3.y );
				b = new Vector3( p4.x, 0, p4.y );
				c = new Vector3( p4.x, BEAM_TOP_HEIGHT, p4.y );
				d = new Vector3( p3.x, BEAM_TOP_HEIGHT, p3.y );
				
				const side3 = _createGeometry( a, b, c, d, [ 0, 2, 1, 0, 3, 2 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
				
				a = new Vector3( p4.x, 0, p4.y );
				b = new Vector3( p1.x, 0, p1.y );
				c = new Vector3( p1.x, BEAM_TOP_HEIGHT, p1.y );
				d = new Vector3( p4.x, BEAM_TOP_HEIGHT, p4.y );
				
				const side4 = _createGeometry( a, b, c, d, [ 0, 2, 1, 0, 3, 2 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
				
				const beamGeometry = BufferGeometryUtils.mergeGeometries( [ top, bottom, side1, side2, side3, side4 ], false );
				const beamMesh = new Mesh( beamGeometry, this.supportMaterial );
					
				beamMesh.castShadow = true;
				beamMesh.receiveShadow = true;
				beamMesh.position.y = BEAM_HEIGHT;
				
				this.beamsGroup.add( beamMesh );
			}
		} );
		
		this.needsShadowUpdate = true;
		this.needsRender = true;
	}
	
	
	
	
	_create()
	{
		const shape = this.shape;
		const outerPoints = shape.getOuterPoints();
		const topInnerPoints = shape.getTopInnerPoints();
		const bottomInnerPoints = shape.getBottomInnerPoints();
		const supports = shape.getSupports();
		
		this.elevation = shape.getElevation();
		
		// ----------------------------------------------------------------------------------------------------
		// supports
		// ----------------------------------------------------------------------------------------------------

			supports.forEach( support =>
			{
				const { displayName, uuid, type, normal, edgePosition, height:supportHeight } = support;
				const { x, y } = support.position;
				const isWallMount = type === SUPPORT_TYPE_WALL_MOUNT;
				const height = isWallMount ? WALL_MOUNT_HEIGHT : supportHeight;
				
				// if( type === SUPPORT_TYPE_POST )
				// {
					const supportGeometry = new BoxGeometry( 120, 1, 120 );
					const supportMesh = new Mesh( supportGeometry, this.supportMaterial );
					
					supportMesh.castShadow = true;
					supportMesh.receiveShadow = true;
					supportMesh.visible = !isWallMount;
					supportMesh.name = uuid;
					supportMesh.scale.set( 1, height, 1 );
					supportMesh.position.set( x, this.elevation - height / 2, y );

					this.supportsGroup.add( supportMesh );
				// }
				
				if( font )
				{
					const geometry = new TextGeometry( displayName, { font, size:120, depth:1 } );
					const supportDisplayNameMesh = new Mesh( geometry, this.supportsTextMaterial );
					
					geometry.rotateX( Math.PI / -2 );
					geometry.computeBoundingBox();
					
					const center = geometry.boundingBox.getCenter( new Vector3() );
					
					geometry.translate( -center.x, -center.y, -center.z );
					
					supportDisplayNameMesh.name = uuid;
					supportDisplayNameMesh.position.set( edgePosition.x + normal.x * 100, 1, edgePosition.y + normal.y * 100 );
					
					
					this.supportsTextGroup.add( supportDisplayNameMesh );
				}
				// 
			} );
		
		// ----------------------------------------------------------------------------------------------------
		// DECKING
		// ----------------------------------------------------------------------------------------------------
		
			this.deckingMaterial.color.set( shape.getDeckingColor() );
			
			this._createDecking();	

		// ----------------------------------------------------------------------------------------------------
		// TRAVERSES
		// ----------------------------------------------------------------------------------------------------
		
			this._createTraverses();
		
		// ----------------------------------------------------------------------------------------------------
		// BORDER
		// ----------------------------------------------------------------------------------------------------
			
			
			
			outerPoints.forEach( ( outerPoint, index ) =>
			{
				const nextIndex = ( index + 1 ) % outerPoints.length;
				const nextOuterPoint = outerPoints[ nextIndex ];
				const nextInnerPoint = topInnerPoints[ nextIndex ];
				const innerPoint = topInnerPoints[ index ];
				
				
				let a, b, c, d;
				
				a = new Vector3( outerPoint.position.x, BORDER_HEIGHT, outerPoint.position.y );
				b = new Vector3( nextOuterPoint.position.x, BORDER_HEIGHT, nextOuterPoint.position.y );
				c = new Vector3( nextInnerPoint.position.x, BORDER_HEIGHT, nextInnerPoint.position.y );
				d = new Vector3( innerPoint.position.x, BORDER_HEIGHT, innerPoint.position.y );
				
				const top = _createGeometry( a, b, c, d, [ 0, 2, 1, 0, 3, 2 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
				
				a = new Vector3( outerPoint.position.x, BOTTOM_BORDER_HEIGHT, outerPoint.position.y );
				b = new Vector3( nextOuterPoint.position.x, BOTTOM_BORDER_HEIGHT, nextOuterPoint.position.y );
				c = new Vector3( nextInnerPoint.position.x, BOTTOM_BORDER_HEIGHT, nextInnerPoint.position.y );
				d = new Vector3( innerPoint.position.x, BOTTOM_BORDER_HEIGHT, innerPoint.position.y );
				
				const bottom = _createGeometry( a, b, c, d, [ 0, 1, 2, 0, 2, 3 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
				
				a = new Vector3( outerPoint.position.x, BOTTOM_BORDER_HEIGHT, outerPoint.position.y );
				b = new Vector3( nextOuterPoint.position.x, BOTTOM_BORDER_HEIGHT, nextOuterPoint.position.y );
				c = new Vector3( nextOuterPoint.position.x, BORDER_HEIGHT, nextOuterPoint.position.y );
				d = new Vector3( outerPoint.position.x, BORDER_HEIGHT, outerPoint.position.y );
				
				const front = _createGeometry( a, b, c, d, [ 0, 2, 1, 0, 3, 2 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
				
				a = new Vector3( innerPoint.position.x, BOTTOM_BORDER_HEIGHT, innerPoint.position.y );
				b = new Vector3( nextInnerPoint.position.x, BOTTOM_BORDER_HEIGHT, nextInnerPoint.position.y );
				c = new Vector3( nextInnerPoint.position.x, BORDER_HEIGHT, nextInnerPoint.position.y );
				d = new Vector3( innerPoint.position.x, BORDER_HEIGHT, innerPoint.position.y );
				
				const back = _createGeometry( a, b, c, d, [ 0, 1, 2, 0, 2, 3 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
				
				const borderGeometry = BufferGeometryUtils.mergeGeometries( [ top, bottom, front, back ], false );
				const borderMesh = new Mesh( borderGeometry, this.supportMaterial );
				
				borderMesh.castShadow = true;
				borderMesh.receiveShadow = true;
					
				this.borderGroup.add( borderMesh );
			} );
			
			outerPoints.forEach( ( outerPoint, index ) =>
			{
				const nextIndex = ( index + 1 ) % outerPoints.length;
				const nextOuterPoint = outerPoints[ nextIndex ];
				const nextInnerPoint = bottomInnerPoints[ nextIndex ];
				const innerPoint = bottomInnerPoints[ index ];
				
				
				let a, b, c, d;
				
				a = new Vector3( outerPoint.position.x, BOTTOM_BORDER_HEIGHT, outerPoint.position.y );
				b = new Vector3( nextOuterPoint.position.x, BOTTOM_BORDER_HEIGHT, nextOuterPoint.position.y );
				c = new Vector3( nextInnerPoint.position.x, BOTTOM_BORDER_HEIGHT, nextInnerPoint.position.y );
				d = new Vector3( innerPoint.position.x, BOTTOM_BORDER_HEIGHT, innerPoint.position.y );
				
				const top = _createGeometry( a, b, c, d, [ 0, 2, 1, 0, 3, 2 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
				
				a = new Vector3( outerPoint.position.x, 0, outerPoint.position.y );
				b = new Vector3( nextOuterPoint.position.x, 0, nextOuterPoint.position.y );
				c = new Vector3( nextInnerPoint.position.x, 0, nextInnerPoint.position.y );
				d = new Vector3( innerPoint.position.x, 0, innerPoint.position.y );
				
				const bottom = _createGeometry( a, b, c, d, [ 0, 1, 2, 0, 2, 3 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
				
				a = new Vector3( outerPoint.position.x, 0, outerPoint.position.y );
				b = new Vector3( nextOuterPoint.position.x, 0, nextOuterPoint.position.y );
				c = new Vector3( nextOuterPoint.position.x, BOTTOM_BORDER_HEIGHT, nextOuterPoint.position.y );
				d = new Vector3( outerPoint.position.x, BOTTOM_BORDER_HEIGHT, outerPoint.position.y );
				
				const front = _createGeometry( a, b, c, d, [ 0, 2, 1, 0, 3, 2 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
				
				a = new Vector3( innerPoint.position.x, 0, innerPoint.position.y );
				b = new Vector3( nextInnerPoint.position.x, 0, nextInnerPoint.position.y );
				c = new Vector3( nextInnerPoint.position.x, BOTTOM_BORDER_HEIGHT, nextInnerPoint.position.y );
				d = new Vector3( innerPoint.position.x, BOTTOM_BORDER_HEIGHT, innerPoint.position.y );
				
				const back = _createGeometry( a, b, c, d, [ 0, 1, 2, 0, 2, 3 ], [ 0, 0, 0, 0, 0, 0, 0, 0, ] );
				
				const borderGeometry = BufferGeometryUtils.mergeGeometries( [ top, bottom, front, back ], false );
				const borderMesh = new Mesh( borderGeometry, this.supportMaterial );
				
				borderMesh.castShadow = true;
				borderMesh.receiveShadow = true;
				
				this.borderGroup.add( borderMesh );
			} );

				
			
			
			
			this.borderGroup.position.y = this.elevation;	
		
		// ----------------------------------------------------------------------------------------------------
		// BEAMS
		// ----------------------------------------------------------------------------------------------------

			this._createBeams();
			
			this.beamsGroup.position.y = this.elevation;
			
		
		// ----------------------------------------------------------------------------------------------------
		// WALLS
		// ----------------------------------------------------------------------------------------------------
			
			this.wallMaterial.color.set( this._wallMaterialToColor( this.shape.getWallMaterial() ) );
			this._createWalls()
		
		//
		
		this.fitToScreen();
		
		this.needsShadowUpdate = true;
		this.needsVersionUpgrade = true;
	}
	
	setActive( value )
	{
		value = !!value;
		
		if( this.active !== value )
		{
			this.active = value;
			
			if( this.active )
			{
				if( this.requestId == null )
				{
					this.render();
					this.needsRender = true;
				}
			}
			else 
			{
				if( this.requestId != null )
				{
					cancelAnimationFrame( this.requestId );
					this.requestId = null;
				}
			}
		}
	}
	
	getVersion()
	{
		return this.version;
	}
	
	_getExport()
	{
		const materials = [];
		const geometries = [];
		const scene = new Group();
		
		const copyMeshes = ( sourceGroup, destinationGroup, material ) =>
		{
			for( let i = 0; i < sourceGroup.children.length; i++ )
			{
				const source = sourceGroup.children[ i ];
				const mesh = new Mesh( source.geometry.clone(), material );
				
				mesh.scale.copy( source.scale );
				mesh.position.copy( source.position );
				mesh.rotation.copy( source.rotation );
				
				geometries.push( mesh.geometry );
				
				destinationGroup.add( mesh );
			}
		};
		
		//
		
		const supportMaterial = this.supportMaterial.clone();
		const deckingMaterial = this.deckingMaterial.clone();
		const bottomDeckingMaterial = this.bottomDeckingMaterial.clone();
		
		supportMaterial.name = 'supports';
		deckingMaterial.name = 'decking';
		bottomDeckingMaterial.name = 'bottomDecking';
		
		materials.push( supportMaterial, deckingMaterial, bottomDeckingMaterial );
		
		//
		
		const counterTraversesGroup = new Group();
		
		counterTraversesGroup.name = 'counterTraverses';
		counterTraversesGroup.position.copy( this.counterTraversesGroup.position );
		
		copyMeshes( this.counterTraversesGroup, counterTraversesGroup, supportMaterial );
		//
		
		const traversesGroup = new Group();
		
		traversesGroup.name = 'traverses';
		traversesGroup.position.copy( this.traversesGroup.position );
		
		copyMeshes( this.traversesGroup, traversesGroup, supportMaterial );
		
		//
		
		const supportsGroup = new Group();

		supportsGroup.name = 'supports';
		supportsGroup.position.copy( this.supportsGroup.position );

		copyMeshes( this.supportsGroup, supportsGroup, supportMaterial );

		//
		
		const borderGroup = new Group();
		
		borderGroup.name = 'border';
		borderGroup.position.copy( this.borderGroup.position );

		copyMeshes( this.borderGroup, borderGroup, supportMaterial );
		
		//
		
		const beamsGroup = new Group();
		
		beamsGroup.name = 'beams';
		beamsGroup.position.copy( this.beamsGroup.position );
		
		copyMeshes( this.beamsGroup, beamsGroup, supportMaterial );
		
		//

		const deckingGroup = new Group(); 
		
		deckingGroup.name = 'decking';
		deckingGroup.position.copy( this.deckingGroup.position );

		copyMeshes( this.deckingGroup, deckingGroup, deckingMaterial );
		
		//
		
		const bottomDeckingGroup = new Group();
		
		bottomDeckingGroup.name = 'bottomDecking';
		bottomDeckingGroup.position.copy( this.bottomDeckingGroup.position );

		copyMeshes( this.bottomDeckingGroup, bottomDeckingGroup, bottomDeckingMaterial );
		
		//
		
		scene.scale.set( 0.001, 0.001, 0.001 );
		scene.add( counterTraversesGroup, traversesGroup, supportsGroup, borderGroup, deckingGroup, bottomDeckingGroup, beamsGroup );
		
		return { materials, geometries, scene };
	}
	
	async toGLB()
	{
		const time = performance.now();	
		const { materials, geometries, scene } = this._getExport();

		return new Promise( ( resolve, reject ) =>
		{
			new GLTFExporter().parseAsync( scene, { trs:true, onlyVisible:true, binary:true, maxTextureSize:4096 } )
			.finally( () =>
			{
				materials.forEach( material => material.dispose() );
				geometries.forEach( geometry => geometry.dispose() );
				
				console.log( performance.now() - time );
			} )
			.then( buffer => resolve( buffer ) )
			.catch( error => reject( error ) );
		} );				
	}
	
	getEditMode()
	{
		return this.editMode;
	}
	
	setEditMode( mode )
	{
		// console.log( 'setEditMode', mode );
		
		if( this.editMode != mode )
		{
			this.editMode = mode;
			this.needsRender = true;
			
			this.supportsTextGroup.visible = this.editMode === EDIT_MODE_SUPPORTS;
		}
	}
	
	fitToScreen( box = null )
	{
		if( box == null )
		{
			this.container.updateMatrixWorld( true );
		
			box = new Box3().expandByObject( this.container );
		}
		
		const size = box.getSize( new Vector3() );
		const center = box.getCenter( new Vector3() );
		const maxSize = Math.max( size.x, size.y, size.z );
		const fitHeightDistance = maxSize / ( 2 * Math.atan( Math.PI * this.camera.fov / 360 ) );
		const fitWidthDistance = fitHeightDistance / this.camera.aspect;
		const distance = Math.max( fitHeightDistance, fitWidthDistance );
		const direction = this.controls.target.clone().sub( this.camera.position ).normalize().multiplyScalar( distance ) ;

		this.controls.minDistance = this.controls.maxDistance = distance * 1.4; 
		this.controls.target.copy( center );

		this.camera.near = distance / 100;
		this.camera.far = distance * 100;
		this.camera.updateProjectionMatrix();

		this.camera.position.copy( this.controls.target ).sub( direction );

		this.controls.update();
		this.controls.minDistance /= 128;
		this.controls.maxDistance *= 2;

		this.needsRender = true;
	}
	
	render()
	{
		if( this.renderer.domElement.parentElement )
		{
			const { width, height } = this.renderer.domElement.parentElement.getBoundingClientRect();

			if( this.width !== width || this.height !== height )
			{
				this.width = width;
				this.height = height;
				
				this.camera.aspect = this.width / this.height;
				this.camera.updateProjectionMatrix();
						
				this.renderer.setSize( this.width, this.height );
				
				this.needsRender = true;
			}
		}
		
		this.controls.update();
		
		if( this.needsSupportsUpdate )
		{
			this._updateSupports();
			
			this.needsSupportsUpdate = false;
			this.needsRender = true;
		}
		
		if( this.needsBeamsUpdate )
		{
			this._createBeams();
			
			this.needsBeamsUpdate = false;
			this.needsRender = true;
		}
		
		
		// before render!
		if( this.needsVersionUpgrade )
		{
			this.needsVersionUpgrade = false;
			this.version++;
			
			// console.log( this.version );
		}
		
		if( this.needsShadowUpdate )
		{
			this.light.shadow.needsUpdate = true;
			
			this.needsShadowUpdate = false;
			this.needsRender = true;
		}

		if( this.needsRender )
		{
			this.needsRender = false;
			
			/*const cameraPosition = this.camera.position.clone();
			
			for( let i = 0; i < this.wallsGroup.children.length; i++ )
			{
				const mesh = this.wallsGroup.children[ i ];
				const { center, normal } = mesh.userData;
				const dot = normal.dot( cameraPosition.clone().sub( center ) );
				
				mesh.visible = ( dot < 0 );
			}*/
			
			this.renderer.clear();
			this.renderer.render( this.scene, this.camera );
		}
		
		if( this.active )
		{
			this.requestId = requestAnimationFrame( () => this.render() );
		}
	}
}

export { View3D };  