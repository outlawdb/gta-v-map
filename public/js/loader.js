export class Loader {
  static init(urls) {
    this.promises = {};
    for (const [name, url] of Object.entries(urls)) {
      this.promises[name] = fetch(url).then((response) => {
        if (!response.ok) throw new Error(`${response.status} ${response.statusText} on ${url}`);
        return response.json();
      });
    }
  }

  static async json(name) {
    const promise = this.promises[name];
    if (!promise) throw new Error(`Loader entry not found: ${name}`);
    return promise;
  }
}
