export interface TiledText {
    text: string;
    /**
     * Whether to use a bold font (default: false)
     */
    bold: boolean;
    /**
     * Hex-formatted color (#RRGGBB or #AARRGGBB) (default: #000000)
     */
    color: string;
    /**
     * Font family (default: sans-serif)
     */
    fontfamily: string;
    /**
     * Horizontal alignment (center, right, justify or left (default))
     */
    halign: 'center' | 'right' | 'justify' | 'left';
    /**
     * Whether to use an italic font (default: false)
     */
    italic: boolean;
    /**
     * Whether to use kerning when placing characters (default: true)
     */
    kerning: boolean;
    /**
     * Pixel size of font (default: 16)
     */
    pixelsize: number;
    /**
     * Whether to strike out the text (default: false)
     */
    strikeout: boolean;
    /**
     * Whether to underline the text (default: false)
     */
    underline: boolean;
    /**
     * Vertical alignment (center, bottom or top (default))
     */
    valign: 'center' | 'bottom' | 'top';
    /**
     * Whether the text is wrapped within the object bounds (default: false)
     */
    wrap: boolean;
 }