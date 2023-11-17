import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { RpgModule, RpgServer } from '@rpgjs/server'
import { _beforeEach } from './beforeEach'
import { clear, testing } from '@rpgjs/testing'
import { Key } from './fixtures/item'
import { HpUpValue } from './fixtures/armor'

function databaseTesting(databaseType: 'object' | 'array') {
    describe('Add Database in Server Module. Property as ' + databaseType, () => {
        let server
    
        describe('One Module', () => {
            beforeEach(async () => {
                @RpgModule<RpgServer>({
                    database: databaseType == 'object' ? {
                        Key,
                        HpUpValue
                    } : [Key, HpUpValue]
                })
                class RpgServerModule { }
        
                const fixture = await testing([
                    {
                        server: RpgServerModule
                    }
                ])
        
                server = fixture.server
            })
        
            test('Added to database', () => {
                expect(server.database).toHaveProperty('key')
                expect(server.database).toHaveProperty('hpupvalue')
            })
        
            test('Contain Type', () => {
                const { database } = server
                expect(database['key']._type).toBe('item')
                expect(database['hpupvalue']._type).toBe('armor')
            })
        })

        describe('Multi Module', () => {
            beforeEach(async () => {
                @RpgModule<RpgServer>({
                    database: databaseType == 'object' ? {
                        Key
                    } : [Key]
                })
                class RpgServerOneModule { }

                @RpgModule<RpgServer>({
                    database: databaseType == 'object' ? {
                        HpUpValue
                    } : [HpUpValue]
                })
                class RpgServerTwoModule { }
        
                const fixture = await testing([
                    {
                        server: RpgServerOneModule
                    },
                    {
                        server: RpgServerTwoModule
                    }
                ])
        
                server = fixture.server
            })
        
            test('Added to database', () => {
                expect(server.database).toHaveProperty('key')
                expect(server.database).toHaveProperty('hpupvalue')
            })
        })
    })
}

describe('addInDatabase function', () => {
    let server

    beforeEach(async () => {
        @RpgModule<RpgServer>({})
        class RpgServerModule { }

        const fixture = await testing([
            {
                server: RpgServerModule
            }
        ])

        server = fixture.server
    })


    test('should correctly add a item class to the database', () => {
        server.addInDatabase('key_id', Key)
        expect(server.database).toHaveProperty('key_id')
    })

    const databaseTypes = ['item', 'weapon', 'armor', 'skill', 'class', 'state', 'actor'];

    databaseTypes.forEach(type => {
        test(`should correctly add an object to the database with type ${type}`, () => {
            server.addInDatabase('db_id', {
                name: 'Fake Name',
                description: 'Fake description',
            }, type)
            expect(server.database).toHaveProperty('db_id')
            expect(typeof server.database['db_id']).toBe('function')
            expect(server.database['db_id']._type).toBe(type)
        });
    });

    test('should throw an error if type is not defined and dataClass is not a class', () => {
        const dataClass = {
            name: 'NonClassObject',
            description: 'This is not a class'
        };

        // Act and Assert
        expect(() => server.addInDatabase('key_id', dataClass)).toThrow('You must specify a type for the database key_id');
    });
});

databaseTesting('object')
databaseTesting('array')

afterEach(() => {
    clear()
})