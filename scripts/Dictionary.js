let _data = null;

class Dictionary
{
	
	static init( json )
	{
		_data = json;
	}
	
	static get = ( key ) => _data?.[ key ] ?? '';
}

export { Dictionary };