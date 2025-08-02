// Centralized color management system for LuxField - Client version
export interface TeamColor {
  name: string;
  color: number;
  teamId: number;
}

export class ColorManager {
  // Central color definitions - easy to modify and extend
  private static readonly TEAM_COLORS: TeamColor[] = [
    { name: 'Blue', color: 0x3399ff, teamId: 1 },
    { name: 'Red', color: 0xff3333, teamId: 2 },
    { name: 'Green', color: 0x33ff33, teamId: 3 },
    { name: 'Yellow', color: 0xffff00, teamId: 4 },
    { name: 'Purple', color: 0x9933ff, teamId: 5 },
    { name: 'Orange', color: 0xff6600, teamId: 6 },
    { name: 'Cyan', color: 0x00ffff, teamId: 7 },
    { name: 'Pink', color: 0xff66cc, teamId: 8 }
  ];

  // Special colors
  static readonly NEUTRAL_COLOR = 0x888888;
  static readonly WHITE_COLOR = 0xffffff;
  static readonly BACKGROUND_COLOR = 0x001122;
  static readonly UI_BACKGROUND = 0x333333;
  static readonly UI_BORDER = 0x666666;
  static readonly UI_OVERLAY = 0x222222;
  static readonly HIGHLIGHT_COLOR = 0xffff00;

  /**
   * Get all available team colors
   */
  static getAvailableColors(): TeamColor[] {
    return [...this.TEAM_COLORS];
  }

  /**
   * Get color by team ID (1-based)
   */
  static getTeamColor(teamId: number): number {
    if (teamId < 1 || teamId > this.TEAM_COLORS.length) {
      return this.NEUTRAL_COLOR;
    }
    return this.TEAM_COLORS[teamId - 1].color;
  }

  /**
   * Get team info by team ID
   */
  static getTeamInfo(teamId: number): TeamColor | null {
    if (teamId < 1 || teamId > this.TEAM_COLORS.length) {
      return null;
    }
    return this.TEAM_COLORS[teamId - 1];
  }

  /**
   * Get team ID by color value
   */
  static getTeamIdByColor(color: number): number {
    const team = this.TEAM_COLORS.find(t => t.color === color);
    return team ? team.teamId : 0;
  }

  /**
   * Get all colors as hex numbers (for backwards compatibility)
   */
  static getColorsArray(): number[] {
    return this.TEAM_COLORS.map(t => t.color);
  }

  /**
   * Get total number of available teams
   */
  static getMaxTeams(): number {
    return this.TEAM_COLORS.length;
  }

  /**
   * Check if a color is a valid team color
   */
  static isValidTeamColor(color: number): boolean {
    return this.TEAM_COLORS.some(t => t.color === color);
  }

  /**
   * Get a random team color
   */
  static getRandomTeamColor(): TeamColor {
    const randomIndex = Math.floor(Math.random() * this.TEAM_COLORS.length);
    return this.TEAM_COLORS[randomIndex];
  }

  /**
   * Convert hex color to CSS string
   */
  static toCSS(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  /**
   * Convert CSS color string to hex number
   */
  static fromCSS(cssColor: string): number {
    const hex = cssColor.replace('#', '');
    return parseInt(hex, 16);
  }

  /**
   * Add a new team color (for dynamic expansion)
   */
  static addTeamColor(name: string, color: number): boolean {
    // Check if color already exists
    if (this.isValidTeamColor(color)) {
      return false;
    }
    
    const newTeamId = this.TEAM_COLORS.length + 1;
    this.TEAM_COLORS.push({ name, color, teamId: newTeamId });
    return true;
  }

  /**
   * Remove a team color by team ID
   */
  static removeTeamColor(teamId: number): boolean {
    const index = teamId - 1;
    if (index < 0 || index >= this.TEAM_COLORS.length) {
      return false;
    }
    
    this.TEAM_COLORS.splice(index, 1);
    
    // Reindex team IDs
    this.TEAM_COLORS.forEach((team, idx) => {
      team.teamId = idx + 1;
    });
    
    return true;
  }

  /**
   * Get color brightness (0-255)
   */
  static getBrightness(color: number): number {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  /**
   * Get contrasting text color (black or white)
   */
  static getContrastColor(backgroundColor: number): number {
    return this.getBrightness(backgroundColor) > 128 ? 0x000000 : 0xffffff;
  }
}
