import {  Schema, Input } from '../../src'

@Schema({
   list: [String]
})
export class Page {
    list = []

    onInit() {
        
    }
}