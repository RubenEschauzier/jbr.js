"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticDockerResourceConstraints = void 0;
/**
 * Allows constraints to be placed on Docker container resources.
 */
class StaticDockerResourceConstraints {
    constructor(cpu, memory) {
        this.cpu = cpu;
        this.memory = memory;
    }
    /**
     * Convert a given quantity string (with optional unit) to an absolute number.
     * For example, '10' will be converted to 10, '10k' to '10240', '1m' to 1048576, and so on.
     * @param amount A quantity string.
     */
    static quantityStringToBytes(amount) {
        const match = /^([0-9]+)([a-z]?)$/u.exec(amount);
        if (!match) {
            throw new Error(`Invalid quantity string '${amount}'`);
        }
        const quantity = Number.parseInt(match[1], 10);
        const unit = match[2];
        const multiplier = StaticDockerResourceConstraints.QUANTITY_UNITS[unit];
        if (!multiplier) {
            throw new Error(`Invalid quantity string unit '${amount}', must be one of '${Object.keys(StaticDockerResourceConstraints.QUANTITY_UNITS).join(', ')}'`);
        }
        return quantity * multiplier;
    }
    /**
     * Obtain a Docker HostConfig object from the current constraints.
     */
    toHostConfig() {
        return Object.assign(Object.assign({}, this.cpu.percentage ? { CpuPeriod: 100000, CpuQuota: this.cpu.percentage * 1000 } : {}), this.memory.limit ? { Memory: StaticDockerResourceConstraints.quantityStringToBytes(this.memory.limit) } : {});
    }
}
exports.StaticDockerResourceConstraints = StaticDockerResourceConstraints;
StaticDockerResourceConstraints.QUANTITY_UNITS = {
    '': 1,
    k: 1 << 10,
    m: 1 << 20,
    g: 1 << 30,
};
//# sourceMappingURL=StaticDockerResourceConstraints.js.map