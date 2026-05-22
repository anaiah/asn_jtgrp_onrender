router.delete('/deleteEmployee/:region/:empid(.*)', async (req, res) => {
    const { region, empid } = req.params;

    // 1. Sanitize the region input for dynamic table construction
    const safeRegion = region.replace(/[^a-zA-Z0-9_]/g, '');
    const employeeTable = `besi_employees_${safeRegion}`;
    const userTable = `besi_users_${safeRegion}`;

    let conn;
    
    try {
        // 2. Get a dedicated connection from the pool and start the transaction
        conn = await mysqls.createConnection(dbconfig);
        await conn.beginTransaction();

        // 3. Execute the first deletion (Employees table)
        const deleteEmployeeSql = `DELETE FROM ${employeeTable} WHERE emp_id = ?`;
        const [empResult] = await conn.execute(deleteEmployeeSql, [empid]);

        // 4. Execute the second deletion (Users table)
        const deleteUserSql = `DELETE FROM ${userTable} WHERE besi_id = ?`;
        const [userResult] = await conn.execute(deleteUserSql, [empid]);

        // Optional check: You can verify if anything was deleted before committing
        if (empResult.affectedRows === 0 && userResult.affectedRows === 0) {
            // No matching records found, rolling back to save resources
            await conn.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'No matching records found in either table.' 
            });
        }

        // 5. Commit the changes to the database
        await conn.commit();

        console.log(`Successfully purged ${empid} from ${employeeTable} and ${userTable}.`);
        return res.status(200).json({ 
            success: true, 
            message: 'Employee data successfully wiped from regional database.' 
        });

    } catch (error) {
        // 6. Roll back database state if any error occurs
        if (conn) {
            console.log('Error encountered. Rolling back transaction...');
            await conn.rollback();
        }
        
        console.error('MySQL Transaction Error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal database error occurred during deletion.' 
        });

    } finally {
        // 7. Always release the connection back to the pool
        if (conn) {
            conn.end();
        }
    }
});
