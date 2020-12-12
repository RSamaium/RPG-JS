export class VariableManager {
    variables: Map<string, any>

    setVariable(key, val) {
        this.variables.set(key, val)
    }

    getVariable(key) {
        return this.variables.get(key)
    }

    removeVariable(key) {
        return this.variables.delete(key)
    }
}