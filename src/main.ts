import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { FrameScheduler } from "./core/FrameScheduler";
import { PointerTracker } from "./core/PointerTracker";
import { Oneko } from "./oneko";
import type { OnekoColor } from "./sprite";

interface MoonSettings {
  color: OnekoColor;
}

const DEFAULT_SETTINGS: MoonSettings = {
  color: "dark",
};

export default class MoonPlugin extends Plugin {
  settings: MoonSettings = DEFAULT_SETTINGS;
  oneko: Oneko | null = null;
  private scheduler: FrameScheduler | null = null;
  private pointer: PointerTracker | null = null;

  async onload(): Promise<void> {
    const saved = (await this.loadData()) as Partial<MoonSettings> | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);

    const scheduler = new FrameScheduler();
    const pointer = new PointerTracker();
    pointer.start();

    const oneko = new Oneko(scheduler, pointer, this.settings.color);
    oneko.enable();

    this.scheduler = scheduler;
    this.pointer = pointer;
    this.oneko = oneko;

    this.addSettingTab(new MoonSettingTab(this.app, this));
  }

  onunload(): void {
    this.oneko?.dispose();
    this.pointer?.dispose();
    this.scheduler?.dispose();
    this.oneko = this.pointer = this.scheduler = null;
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

class MoonSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: MoonPlugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    this.containerEl.empty();

    new Setting(this.containerEl)
      .setName("cat")
      .setDesc("a dark cat or a light one")
      .addDropdown((d) =>
        d
          .addOption("dark", "dark")
          .addOption("light", "light")
          .setValue(this.plugin.settings.color)
          .onChange(async (value) => {
            this.plugin.settings.color = value as OnekoColor;
            this.plugin.oneko?.setColor(this.plugin.settings.color);
            await this.plugin.saveSettings();
          }),
      );
  }
}
