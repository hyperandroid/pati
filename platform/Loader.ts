export interface Resource {
	id : string;
	type : ResourceType;

	load();
	get() : any;
}

export type LoadedCallback = (r: Resource) => void;
export type ErroredCallback = (r: Resource) => void;

export enum ResourceType {
	Image,
	Text
}

export class ImageResource implements Resource {

	readonly id: string;
	readonly type = ResourceType.Image;
	private readonly url: string;
	private readonly image: HTMLImageElement;

	constructor(id_: string, url: string, onLoaded: LoadedCallback, onErrored: ErroredCallback) {


		const img = new Image() as HTMLImageElement;

		img.onload = (e: Event) => {
			onLoaded(this);
		};

		img.onerror = (e: Event) => {
			onErrored(this);
		};

		this.id = id_;
		this.url = url;
		this.image = img;
	}

	load() {
		this.image.src = this.url;
	}

	get() {
		return this.image;
	}
}
export class TextResource implements Resource {

	readonly id: string;
	readonly type = ResourceType.Text;
	private readonly url: string;

	private readonly xhr: XMLHttpRequest;

	private text: string;

	constructor(id_: string, url: string, onLoaded: LoadedCallback, onErrored: ErroredCallback) {
		this.id = id_;
		this.url = url;

		this.xhr = new XMLHttpRequest();
		this.xhr.open("GET", this.url, true);
		this.xhr.onload = (ev: any) => {
			if (this.xhr.status != 200) {
				this.text = "";
				onErrored(this);
			} else {
				this.text = ev.currentTarget ? ev.currentTarget.responseText : ev.target.responseText;
				onLoaded(this);
			}
		};

		this.xhr.onerror = (ev: any) => {
			this.text = "";
			onErrored(this);
		};
	}

	load() {
		console.log(`loading ${this.url}`);
		this.xhr.send();
	}

	get() {
		return this.text;
	}
}

enum LoaderStatus {
	CREATING,
	LOADING,
	DONE
}

export interface LoadedImages {
	id: string;
	image: HTMLImageElement;
}

export type LoaderEnded = (loader: Loader) => void;

export class Loader {

	private numResourcesToLoad = 0;
	private resources: {[key:string]:Resource} = {};
	private status = LoaderStatus.CREATING;
	private currentLoadedResources = 0;
	private erroredResources = 0;
	private onLoadEnded: LoaderEnded = null;

	constructor() {
	}

	addImage(url: string|string[]) {
		if (typeof url==='string') {
			this.addImageImpl(url as string);
		} else {
			const urls = url as string[];
			urls.forEach( u => this.addImageImpl(u) );
		}

		return this;
	}

	addText(url: string|string[]) {
		if (typeof url==='string') {
			this.addTextImpl(url as string);
		} else {
			const urls = url as string[];
			urls.forEach( u => this.addTextImpl(u) );
		}

		return this;
	}

	protected addTextImpl(url: string) {
		if (this.status===LoaderStatus.CREATING) {

			let index = url.lastIndexOf('/');
			let id = url.substring(index+1);	// accounts for lastIndexOf===-1
			let endindex = id.lastIndexOf('?');
			if (endindex!==-1) {
				id = url.substring(0,endindex);
			}

			if (this.resources[id]!==void 0) {
				console.warn(`${id} has already been added to download list. Skipping`);
			} else {
				this.resources[id] = new TextResource(id, url, this.onLoaded.bind(this), this.onErrored.bind(this));
				this.numResourcesToLoad++;
			}
		} else {
			console.error(`Text Resource not added: ${url}. Bad state.`);
		}
	}

	protected addImageImpl(url: string) {
		if (this.status===LoaderStatus.CREATING) {

			let index = url.lastIndexOf('/');
			let id = url.substring(index+1);	// accounts for lastIndexOf===-1
			let endindex = id.lastIndexOf('?');
			if (endindex!==-1) {
				id = url.substring(0,endindex);
			}

			if (this.resources[id]!==void 0) {
				console.warn(`${id} has already been added to download list. Skipping`);
			} else {
				this.resources[id] = new ImageResource(id, url, this.onLoaded.bind(this), this.onErrored.bind(this));
				this.numResourcesToLoad++;
			}
		} else {
			console.error(`HTMLImageElement Resource not added: ${url}. Bad state.`);
		}
	}

	protected onLoaded(r: Resource) {
		this.loaded(r);
	}

	protected onErrored(r: Resource) {
		this.erroredResources++;
		console.error(`Error loading resource ${r.id}`);
		this.loaded(r);
	}

	protected loaded(r: Resource) {
		this.currentLoadedResources++;
		if (this.currentLoadedResources===this.numResourcesToLoad) {
			this.onLoadEnded( this );
			this.status = LoaderStatus.DONE;
		}

		console.info(`loaded ${r.id} - ${this.currentLoadedResources}/${this.numResourcesToLoad}. Errored: ${this.erroredResources}`);
	}

	load(cb: LoaderEnded) {
		this.status = LoaderStatus.LOADING;
		this.onLoadEnded = cb;
		console.info(`About to load ${this.numResourcesToLoad} elements`)
		Object.keys(this.resources).forEach( k => this.resources[k].load() );
	}

	get isError() {
		return this.erroredResources!==0;
	}

	getText(id: string) : string {
		return this.resources[id].get() as string;
	}

	getImage(id: string) : HTMLImageElement {
		return this.resources[id].get();
	}

	getImagesWith(ids: string[]) : HTMLImageElement[] {

		const ret: HTMLImageElement[] = [];
		ids.forEach( id => {
			const r = this.resources[id];
			if (r!==void 0) {
				ret.push(r.get() as HTMLImageElement);
			}
		});

		return ret;
	}

	getImages() : LoadedImages[] {
		return this.getResourceByType(ResourceType.Image).map( (e) => {
			return {
				image: e.get() as HTMLImageElement,
				id: e.id
			}
		});
	}

	protected getResourceByType(t: ResourceType) : Resource[] {
		const ret: Resource[] = [];
		Object.keys(this.resources).forEach( k => {
			const r = this.resources[k];
			if ( r.type===t ) {
				ret.push(r);
			}
		});

		return ret;
	}
}