// Mock for the obsidian module - used in tests

export class NumberValue {
	constructor(private val: number) {}
	toString() { return String(this.val); }
	isTruthy() { return this.val !== 0; }
}

export class BooleanValue {
	constructor(private val: boolean) {}
	toString() { return String(this.val); }
	isTruthy() { return this.val; }
}

export class StringValue {
	constructor(private val: string) {}
	toString() { return this.val; }
	isTruthy() { return this.val.length > 0; }
}

export class DateValue {
	constructor(private val: string) {}
	toString() { return this.val; }
	isTruthy() { return true; }
}

export class NullValue {
	toString() { return 'null'; }
	isTruthy() { return false; }
}

// Mock Plugin class
export class Plugin {
	app = {};
	manifest = {};
	loadData() { return Promise.resolve({}); }
	saveData() { return Promise.resolve(); }
	addCommand() {}
	addSettingTab() {}
	registerView() {}
}

// Mock other commonly used exports
export class PluginSettingTab {}
export class Setting {}
export class Notice {}
