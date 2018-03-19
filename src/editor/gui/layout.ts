
export default class Layout {
  // Public members
  public element: W2UI.W2Layout;
  public name: string;
  public panels: W2UI.W2Panel[] = [];


  /**
   * Constructor
   * @param name the layout name
   */
  constructor (name: string) {
    this.name = name;
 

}

  /**
   * Returns the size of the given panel
   */
  public getPanelSize (type: string): { width: number; height: number; } {
    const panel = this.getPanelFromType(type);
    return {
      width: panel['width'],
      height: panel['height']
    }
  }

  /**
   * Locks the given panel type
   * @param type the panel type
   * @param message the message to show
   * @param showSpinner if to show a spinner
   */
  public lockPanel (type: string, message?: string, showSpinner?: boolean): void {
    this.element.lock(type, message, showSpinner);
  }

  /**
   * Unlocks the given panel
   * @param type the panel type
   */
  public unlockPanel (type: string): void {
    this.element.unlock(type);
  }

  /**
   * Returns the panel from the given type
   * @param type the panel type
   */
  public getPanelFromType (type: string): W2UI.W2Panel {
    return this.element.get(type);
  }

  /**
   * Builds the layout
   * @param parentId the parent id
   */
  public build (parentId: string): void {
    this.element = $("#" + parentId).w2layout({
      name: this.name,
      panels: this.panels
    });
  }
}