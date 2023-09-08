import cssPlugin from '../src/build/vite-plugin-css'
import { beforeEach, describe, expect, test } from 'vitest';
import mockFs from 'mock-fs';

describe('cssPlugin', () => {

    beforeEach(() => {
        mockFs.restore();
    });


    test('should import from src/config/client/theme.scss if it exists', () => {
        mockFs({
            'src/config/client/theme.scss': 'body { background: red; }'
        });

        const plugin: any = cssPlugin({});
        const newConfig = plugin.config({});
        expect(newConfig.css.preprocessorOptions.scss.additionalData).toContain('@import "@/config/client/theme.scss"');
    });

    test('should import from theme.scss in root if it exists', () => {
        mockFs({
            'theme.scss': 'body { background: blue; }'
        });

        const plugin: any = cssPlugin({});
        const newConfig = plugin.config({});
        expect(newConfig.css.preprocessorOptions.scss.additionalData).toContain('@import "@/theme.scss"');
    });

    test('should import from config.themeCss if it exists', () => {
        mockFs({
            'src/custom-theme.scss': 'body { background: yellow; }'
        });

        const plugin: any = cssPlugin({ themeCss: 'src/custom-theme.scss' });
        const newConfig = plugin.config({});
        expect(newConfig.css.preprocessorOptions.scss.additionalData).toContain('@import "@/src/custom-theme.scss"');
    });

    test('should throw an error if config.themeCss path does not exist', () => {
        const plugin: any = cssPlugin({ themeCss: 'nonexistent.scss' });
        expect(() => plugin.config({})).toThrowError(`File nonexistent.scss not found`);
    });

    test('should use DEFAULT_THEME if no other file is found', () => {
        const plugin: any = cssPlugin({});
        const newConfig = plugin.config({});
        expect(newConfig.css.preprocessorOptions.scss.additionalData).toContain('$window-background: linear-gradient(148deg, rgba(79,82,136,0.7) 0%, rgba(42,43,73,0.7) 100%);');
    });

});