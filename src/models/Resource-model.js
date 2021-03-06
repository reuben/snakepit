const Sequelize = require('sequelize')
const sequelize = require('./db.js')
const Alias = require('./Alias-model.js')
const Allocation = require('./Allocation-model.js')
const Group = require('./Group-model.js')
const User = require('./User-model.js')

var Resource = sequelize.define('resource', {
    id:           { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    type:         { type: Sequelize.STRING,  allowNull: false },
    index:        { type: Sequelize.INTEGER, allowNull: false },
    name:         { type: Sequelize.STRING,  allowNull: false }
})

Resource.hasMany(Allocation)
Allocation.belongsTo(Resource)

Resource.belongsTo(Alias, { constraints: false, foreignKey: 'name', targetKey: 'name' })
//Alias.belongsTo(Resource, { foreignKey: 'name', targetKey: 'name' })

var ResourceGroup = Resource.ResourceGroup = sequelize.define('resourcegroup', {
    resourceId:   { type: Sequelize.INTEGER,  unique: 'pk' },
    groupId:      { type: Sequelize.STRING,   unique: 'pk' }
})
Resource.hasMany(ResourceGroup, { onDelete: 'cascade' })
Group.hasMany(ResourceGroup, { onDelete: 'cascade' })
ResourceGroup.belongsTo(Resource)
ResourceGroup.belongsTo(Group)

User.prototype.canAccessResource = async function (resource) {
    if (this.admin) {
        return true
    }
    return await Resource.findOne({
        where: { id: resource.id, '$resourcegroups->group->usergroups.userId$': this.id },
        include: [
            {
                model: ResourceGroup,
                require: true,
                include: [
                    {
                        model: Group,
                        require: true,
                        include: [
                            {
                                model: User.UserGroup,
                                require: true
                            }
                        ]
                    }
                ]
            }
        ]
    })
}

Resource.prototype.addUtilization = async function (compute, memory) {
    let allocations = await this.getAllocations(Allocation.activeQuery)
    if (allocations && allocations.length > 0) {
        let allocation = allocations[0]
        allocation.cmemory   = memory
        allocation.amemory  += memory
        allocation.ccompute  = compute
        allocation.acompute += compute
        allocation.samples++
        await allocation.save()
    }
}

module.exports = Resource
