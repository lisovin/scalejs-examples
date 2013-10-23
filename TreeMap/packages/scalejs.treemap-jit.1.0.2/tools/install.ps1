param($installPath, $toolsPath, $package, $project)

$project |
	Add-Paths "{
		'scalejs.treemap-jit' : 'Scripts/scalejs.treemap-jit-$($package.Version)',
		'jit' : 'Scripts/jit'
	}" |
	Add-ScalejsExtension 'scalejs.treemap-jit' |
	Add-Shims "{
		'jit' : {
			exports: '`$jit'
		}
	}" |
	Out-Null