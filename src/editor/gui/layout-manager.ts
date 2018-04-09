import GoldenLayout = require("golden-layout");

export default class LayoutManager {
  // Public members
  public element: GoldenLayout;
  public config: GoldenLayout.Config;


  /**
   * Constructor
   * @param name the layout name
   */
  constructor (config: GoldenLayout.Config) {
    this.config = config;
    this.element = new GoldenLayout(this.config);
  }

  public getFirstItemById(searchid: string){
    return this.element.root.getItemsById(searchid)[0]
  }
  
  public addComponent(name: string, htmlcode: string){
    this.element.registerComponent(name, ( container ) => {
      container.getElement().html(htmlcode);
    })
  }


  public build(): void {
    this.element.init();
  }

}
